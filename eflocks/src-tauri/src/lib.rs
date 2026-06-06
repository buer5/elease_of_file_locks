use std::env;
use sysinfo::System;
use tauri::{AppHandle, Manager};
use winreg::enums::*;
use winreg::RegKey;

use windows::{
    core::{PCWSTR, PWSTR, HSTRING},
    Win32::{
        Foundation::{ERROR_MORE_DATA, ERROR_SUCCESS, WIN32_ERROR},
        System::{
            RestartManager::{
                RmEndSession, RmGetList, RmRegisterResources, RmStartSession, RM_PROCESS_INFO,
            }
        },
        UI::Shell::{IsUserAnAdmin, ShellExecuteW},
    },
};

#[tauri::command]
fn check_admin() -> bool {
    unsafe { IsUserAnAdmin().into() }
}

#[tauri::command]
fn elevate_privileges() {
    let current_exe = env::current_exe().unwrap_or_default();
    let current_exe_str = current_exe.to_str().unwrap_or_default();
    let args: Vec<String> = env::args().skip(1).collect();
    let args_str = args.join(" ");

    let exe = HSTRING::from(current_exe_str);
    let params = HSTRING::from(args_str);
    let runas = HSTRING::from("runas");

    unsafe {
        let _ = ShellExecuteW(
            None,
            &runas,
            &exe,
            &params,
            None,
            windows::Win32::UI::WindowsAndMessaging::SW_SHOW,
        );
    }
    std::process::exit(0);
}

#[tauri::command]
fn install_context_menu(title: &str) -> Result<(), String> {
    let current_exe = env::current_exe().map_err(|e| e.to_string())?;
    let exe_path = current_exe.to_str().unwrap_or_default();
    
    let command = format!("\"{}\" \"%1\"", exe_path);

    let hklm = RegKey::predef(HKEY_CLASSES_ROOT);
    
    let paths = [r"*\shell\UnlockFile", r"Directory\shell\UnlockFile"];
    for path in paths.iter() {
        let (key, _) = hklm.create_subkey(path).map_err(|e| e.to_string())?;
        key.set_value("", &title).map_err(|e| e.to_string())?;
        key.set_value("Icon", &"imageres.dll,-78").map_err(|e| e.to_string())?;

        let (command_key, _) = key.create_subkey("command").map_err(|e| e.to_string())?;
        command_key.set_value("", &command).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn uninstall_context_menu() -> Result<(), String> {
    let hklm = RegKey::predef(HKEY_CLASSES_ROOT);
    let paths = [r"*\shell\UnlockFile", r"Directory\shell\UnlockFile"];
    for path in paths.iter() {
        let _ = hklm.delete_subkey(format!(r"{}\command", path));
        let _ = hklm.delete_subkey(path);
    }

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", KEY_SET_VALUE) {
        let _ = key.delete_value("FileUnlocker_AutoStart");
    }

    Ok(())
}

#[tauri::command]
fn set_autostart(title: &str) -> Result<(), String> {
    let current_exe = env::current_exe().map_err(|e| e.to_string())?;
    let exe_path = current_exe.to_str().unwrap_or_default();
    let command = format!("\"{}\" --autostart", exe_path);

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu.create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run").map_err(|e| e.to_string())?;
    key.set_value("FileUnlocker_AutoStart", &command).map_err(|e| e.to_string())?;

    install_context_menu(title)?;
    Ok(())
}

#[tauri::command]
fn get_locking_pids(path: &str) -> Vec<u32> {
    let mut pids = Vec::new();
    unsafe {
        let mut session_handle: u32 = 0;
        let mut session_key: [u16; 256] = [0; 256];

        if RmStartSession(&mut session_handle, 0, PWSTR(session_key.as_mut_ptr())).is_err() {
            return pids;
        }

        let path_h = HSTRING::from(path);
        let pcwstr = PCWSTR(path_h.as_ptr());
        let resources = [pcwstr];

        if RmRegisterResources(session_handle, Some(&resources), None, None).is_err() {
            let _ = RmEndSession(session_handle);
            return pids;
        }

        let mut n_proc_info_needed: u32 = 0;
        let mut n_proc_info: u32 = 0;
        let mut lpdw_reboot_reasons: u32 = 0;

        let err = RmGetList(
            session_handle,
            &mut n_proc_info_needed,
            &mut n_proc_info,
            None,
            &mut lpdw_reboot_reasons,
        );

        if err != ERROR_SUCCESS && err != ERROR_MORE_DATA {
            let _ = RmEndSession(session_handle);
            return pids;
        }

        if n_proc_info_needed > 0 {
            let mut proc_infos: Vec<RM_PROCESS_INFO> = vec![std::mem::zeroed(); n_proc_info_needed as usize];
            n_proc_info = n_proc_info_needed;

            let err2 = RmGetList(
                session_handle,
                &mut n_proc_info_needed,
                &mut n_proc_info,
                Some(proc_infos.as_mut_ptr()),
                &mut lpdw_reboot_reasons,
            );

            if err2 == ERROR_SUCCESS {
                for i in 0..n_proc_info {
                    pids.push(proc_infos[i as usize].Process.dwProcessId);
                }
            }
        }

        let _ = RmEndSession(session_handle);
    }
    pids
}

#[derive(serde::Serialize)]
struct ProcessInfo {
    pid: u32,
    name: String,
}

#[tauri::command]
fn get_process_info(pids: Vec<u32>) -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut infos = Vec::new();

    for pid in pids {
        if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
            infos.push(ProcessInfo {
                pid,
                name: process.name().to_string_lossy().to_string(),
            });
        }
    }
    infos
}

#[tauri::command]
fn kill_processes(pids: Vec<u32>) -> Vec<u32> {
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut killed = Vec::new();

    for pid in pids {
        if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
            if process.kill() {
                killed.push(pid);
            }
        }
    }
    killed
}

#[tauri::command]
fn get_args() -> Vec<String> {
    env::args().collect()
}

#[tauri::command]
fn resize_window(app: tauri::AppHandle, width: f64, height: f64) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(tauri::LogicalSize::new(width, height));
    }
}

#[tauri::command]
fn minimize_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
fn close_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_admin,
            elevate_privileges,
            install_context_menu,
            uninstall_context_menu,
            set_autostart,
            get_locking_pids,
            get_process_info,
            kill_processes,
            get_args,
            resize_window,
            minimize_window,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
