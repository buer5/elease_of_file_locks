# eflocks

A lightweight, native Windows utility to forcefully unlock files and folders by identifying and terminating the processes locking them. Built with Tauri (Node.js + Rust).

## Features

- Context Menu Integration: Right-click any file or folder in Windows Explorer to instantly analyze and unlock it.
- Native OS APIs: Utilizes the native Windows Restart Manager API (rstrtmgr.dll) for highly accurate and fast process detection, bypassing slow and unreliable handle iteration.
- Zero Background Usage: The application runs only when explicitly invoked. The auto-start option purely guards the registry keys and exits instantly without lingering in memory.
- Multi-language Support: Includes translations for English, Japanese, Korean, Traditional Chinese, and Simplified Chinese.
- UAC Elevation Prompting: Automatically prompts for Administrator privileges if the locking process requires higher permissions to terminate.
- Minimal Footprint: Built with Rust and vanilla web technologies, producing a tiny standalone executable without the heavy overhead of frameworks like Electron.

## Installation & Usage

You can find the pre-compiled binaries in the `releases` folder of this repository.

1. Run the `eflocks.exe` standalone executable (or use the `.msi` or `setup.exe` installer).
2. In the Settings window, select your preferred language.
3. Click "Add to Context Menu".
4. Right-click any locked file or folder in Windows, and select "Unlock File/Folder".
5. Click "Kill" next to the process locking the file to terminate it.

## Development

To build this project locally, you will need Node.js and Rust installed on your system.

```bash
# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for release
npm run tauri build
```

## License

MIT License