const { invoke } = window.__TAURI__.core;

const translations = {
  "en": {
    settings: "Settings",
    installMenu: "Add to Context Menu",
    uninstallMenu: "Remove Context Menu",
    autostart: "Enable Auto-Start (Registry Guard)",
    fileLabel: "File: ",
    pid: "PID",
    name: "Process Name",
    status: "Status",
    scanning: "Scanning processes...",
    noProcess: "No processes found locking this file",
    scanErr: "Scan error: ",
    kill: "Kill",
    uac: "Failed to kill process. Permission denied. Retry with UAC elevation?",
    menuTitle: "Unlock File/Folder",
    installSuccess: "Successfully added to context menu!",
    installFailed: "Failed to add to context menu: ",
    uninstallSuccess: "Successfully removed context menu and autostart!",
    uninstallFailed: "Failed to remove: ",
    autostartSuccess: "Auto-start enabled! It will guard the registry silently.",
    autostartFailed: "Failed to enable auto-start: ",
  },
  "zh-CN": {
    settings: "设置",
    installMenu: "注册右键菜单",
    uninstallMenu: "移除右键菜单",
    autostart: "设置开机自启 (守护注册表)",
    fileLabel: "文件: ",
    pid: "PID",
    name: "Process Name",
    status: "状态",
    scanning: "正在扫描进程...",
    noProcess: "没有发现任何占用此文件的进程",
    scanErr: "扫描出错: ",
    kill: "结束进程",
    uac: "结束进程失败，可能是权限不足。是否要进行 UAC 提权重试？",
    menuTitle: "解除文件/文件夹占用",
    installSuccess: "已成功添加到右键菜单！去随便右键一个文件试试吧！",
    installFailed: "添加右键菜单失败：",
    uninstallSuccess: "已成功移除右键菜单和开机自启！",
    uninstallFailed: "移除失败：",
    autostartSuccess: "已设置开机自启！每次开机都会自动守护您的右键菜单，依然零后台驻留。",
    autostartFailed: "设置开机自启失败：",
  },
  "zh-TW": {
    settings: "設定",
    installMenu: "註冊右鍵選單",
    uninstallMenu: "移除右鍵選單",
    autostart: "設定開機自啟 (守護登錄檔)",
    fileLabel: "檔案: ",
    pid: "PID",
    name: "Process Name",
    status: "狀態",
    scanning: "正在掃描處理程序...",
    noProcess: "沒有發現任何佔用此檔案的處理程序",
    scanErr: "掃描出錯: ",
    kill: "結束處理程序",
    uac: "結束處理程序失敗，權限不足。是否要進行 UAC 提權重試？",
    menuTitle: "解除檔案/資料夾佔用",
    installSuccess: "已成功添加到右鍵選單！",
    installFailed: "添加右鍵選單失敗：",
    uninstallSuccess: "已成功移除右鍵選單和開機自啟！",
    uninstallFailed: "移除失敗：",
    autostartSuccess: "已設定開機自啟！",
    autostartFailed: "設定開機自啟失敗：",
  },
  "ja": {
    settings: "設定",
    installMenu: "コンテキストメニューに追加",
    uninstallMenu: "コンテキストメニューを削除",
    autostart: "自動起動を有効にする",
    fileLabel: "ファイル: ",
    pid: "PID",
    name: "Process Name",
    status: "状態",
    scanning: "プロセスをスキャン中...",
    noProcess: "このファイルをロックしているプロセスは見つかりませんでした",
    scanErr: "スキャンエラー: ",
    kill: "終了",
    uac: "プロセスの終了に失敗しました。権限がありません。UACで再試行しますか？",
    menuTitle: "ファイルのロックを解除",
    installSuccess: "コンテキストメニューに追加しました！",
    installFailed: "追加に失敗しました: ",
    uninstallSuccess: "コンテキストメニューを削除しました！",
    uninstallFailed: "削除に失敗しました: ",
    autostartSuccess: "自動起動を有効にしました！",
    autostartFailed: "有効化に失敗しました: ",
  },
  "ko": {
    settings: "설정",
    installMenu: "컨텍스트 메뉴에 추가",
    uninstallMenu: "컨텍스트 메뉴에서 제거",
    autostart: "자동 시작 활성화",
    fileLabel: "파일: ",
    pid: "PID",
    name: "Process Name",
    status: "상태",
    scanning: "프로세스 스캔 중...",
    noProcess: "이 파일을 잠그고 있는 프로세스가 없습니다",
    scanErr: "스캔 오류: ",
    kill: "종료",
    uac: "프로세스 종료 실패. 권한이 없습니다. UAC로 다시 시도하시겠습니까?",
    menuTitle: "파일/폴더 잠금 해제",
    installSuccess: "컨텍스트 메뉴에 추가되었습니다!",
    installFailed: "추가 실패: ",
    uninstallSuccess: "컨텍스트 메뉴가 제거되었습니다!",
    uninstallFailed: "제거 실패: ",
    autostartSuccess: "자동 시작이 활성화되었습니다!",
    autostartFailed: "활성화 실패: ",
  }
};

let currentLang = localStorage.getItem("lang") || "en";

function t(key) {
  return translations[currentLang][key];
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });
}

let targetFilepath = null;

async function init() {
  try {
    document.getElementById("lang-select").value = currentLang;
    applyLanguage();

    document.getElementById("lang-select").addEventListener("change", (e) => {
      currentLang = e.target.value;
      localStorage.setItem("lang", currentLang);
      applyLanguage();
    });

    document.getElementById('titlebar-minimize').addEventListener('click', () => invoke('minimize_window'));
    document.getElementById('titlebar-close').addEventListener('click', () => invoke('close_window'));

    const args = await invoke("get_args");
    
    if (args.length > 1 && args[1] === "--autostart") {
      await invoke("install_context_menu", { title: t("menuTitle") });
      window.close();
      return;
    }

    if (args.length > 1) {
      targetFilepath = args[1];
      invoke("resize_window", { width: 450, height: 280 });
      showUnlockerUi();
    } else {
      invoke("resize_window", { width: 300, height: 280 });
      showInstallUi();
    }
  } catch (error) {
    console.error("Init error:", error);
  }
}

function showInstallUi() {
  document.getElementById("install-ui").classList.remove("hidden");
  
  document.getElementById("btn-install").addEventListener("click", async () => {
    try {
      await invoke("install_context_menu", { title: t("menuTitle") });
      alert(t("installSuccess"));
    } catch (e) {
      alert(t("installFailed") + e);
    }
  });

  document.getElementById("btn-uninstall").addEventListener("click", async () => {
    try {
      await invoke("uninstall_context_menu");
      alert(t("uninstallSuccess"));
    } catch (e) {
      alert(t("uninstallFailed") + e);
    }
  });

  document.getElementById("btn-autostart").addEventListener("click", async () => {
    try {
      await invoke("set_autostart", { title: t("menuTitle") });
      alert(t("autostartSuccess"));
    } catch (e) {
      alert(t("autostartFailed") + e);
    }
  });
}

async function showUnlockerUi() {
  document.getElementById("unlock-ui").classList.remove("hidden");
  document.getElementById("target-path").textContent = targetFilepath;

  const processList = document.getElementById("process-list");
  const baseHeight = 110;
  const rowHeight = 35;

  try {
    const pids = await invoke("get_locking_pids", { path: targetFilepath });
    
    if (pids.length === 0) {
      processList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--success);">${t("noProcess")}</td></tr>`;
      invoke("resize_window", { width: 450, height: baseHeight + 50 });
      return;
    }

    const processInfos = await invoke("get_process_info", { pids });
    let finalHeight = baseHeight + (processInfos.length * rowHeight);
    if (finalHeight > 450) finalHeight = 450;
    invoke("resize_window", { width: 450, height: finalHeight });

    processList.innerHTML = "";
    processInfos.forEach(p => {
      const tr = document.createElement("tr");
      tr.id = `row-${p.pid}`;
      tr.innerHTML = `
        <td>${p.pid}</td>
        <td>${p.name}</td>
        <td class="status-cell">Running</td>
        <td><button class="btn-inline-danger kill-btn" data-pid="${p.pid}">${t("kill")}</button></td>
      `;
      processList.appendChild(tr);
    });

    document.querySelectorAll(".kill-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const pid = parseInt(e.target.getAttribute("data-pid"));
        e.target.disabled = true;
        try {
          const killedPids = await invoke("kill_processes", { pids: [pid] });
          const row = document.getElementById(`row-${pid}`);
          const statusCell = row.querySelector(".status-cell");

          if (killedPids.includes(pid)) {
            statusCell.textContent = "Stopped";
            statusCell.style.color = "var(--success)";
            e.target.style.display = "none";
          } else {
            statusCell.textContent = "Failed";
            statusCell.style.color = "var(--danger-bg)";
            e.target.disabled = false;
            
            const isAdmin = await invoke("check_admin");
            if (!isAdmin) {
              if (confirm(t("uac"))) {
                await invoke("elevate_privileges");
              }
            }
          }
        } catch (err) {
          console.error(err);
          e.target.disabled = false;
        }
      });
    });

  } catch (e) {
    processList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger-bg);">${t("scanErr")}${e}</td></tr>`;
    invoke("resize_window", { width: 450, height: baseHeight + 50 });
  }
}

window.addEventListener("DOMContentLoaded", init);
