# WorkPulse

A personal attendance and productivity suite that started as a single desktop app (originally the "NIST Attendance Management System") and has since grown into four related codebases in this repo. Active development is concentrated in the ASP.NET Core API and the Next.js web app; the original Avalonia desktop app and the Blazor web app are earlier generations kept for reference.

## Architecture

- **`WorkPulse/`** — the original Avalonia (.axaml) cross-platform desktop app (Linux/Windows/macOS). Local-only, stores attendance data as JSON files.
- **`WorkPulse.Api/`** — ASP.NET Core Web API backend. Data is stored in **MongoDB Atlas**, auth via ASP.NET Core Identity (JWT), deployed as an AWS Lambda container image.
- **`WorkPulse.Shared/`** — DTOs/models shared across the .NET projects.
- **`WorkPulse.Web/`** — an earlier Blazor WebAssembly web client, predates `workpulse-next`.
- **`workpulse-next/`** — the current Next.js / React / TypeScript web app (Tailwind v4, shadcn-style components), deployed on Vercel. This is where new features land first.

## Implemented Features

### Attendance Tracking

- Daily login/logout time recording with automatic day-of-week detection and overtime calculation
- Monthly attendance dashboard with settlement-period summaries (work days, overtime count/duration), including custom settlement period overrides
- Excel import (auto-detects month sections, work days, holidays, weekends, overtime) and formatted Excel export

### Business Trips & Reimbursement

- Trip applications, settlements, and document/receipt management (domestic trips; overseas support in progress)
- Reimbursement categories and document upload, with optional Google Drive mirroring of uploaded files

### Reports, Contacts & Reference Tools

- Daily and weekly work reports (note-style editor)
- Contact Book with department/email directory search
- Bookmark library with Chrome-bookmark import/export
- Japanese dictionary with JLPT-level tagging
- Resources library for saved guides, links, and files
- Gmail label browsing/sync (optional, requires connecting a Gmail account)

### Sharing & Collaboration

- Share trips, reports, contacts, bookmarks, and resources with other users via read/edit permission grants

### Accounts & Settings

- Admin dashboard for managing user accounts and access
- Two-factor authentication (email code), active session management, and full data export
- Theming: light/dark/system, accent color, adjustable font size, and (new) a macOS-27-style "Liquid Glass" intensity slider controlling the transparency of the sidebar, cards, and toolbars app-wide

### Platform

- MongoDB Atlas as the primary datastore (GridFS for file content), AWS Lambda hosting for the API
- Account deletion purges all user data across every collection and file store


## Desktop App (`WorkPulse/`) — Setup Guide - Run on Local Machine [Ubuntu / Windows]

**Prerequisties for Building from Source**

- **[.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)**


1. Clone the repository

```bash
git clone https://github.com/sachindsilvaNIST/NISTAttendanceManagementSystem.git
```

2. Change the directory 

```bash
cd NISTAttendanceManagementSystem
```

3. Build for `Ubuntu` 
```bash
dotnet publish WorkPulse/WorkPulse.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

4. Build for `Windows`
```bash
dotnet publish WorkPulse/WorkPulse.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

## `Deployment on Local Machine [Ubuntu / Windows]`


### Ubuntu Users

1. Copy the binary to a permanent location:
```bash 
sudo mkdir -p /opt/workpulse
```

```bash
sudo cp WorkPulse/bin/Release/net8.0/linux-x64/publish/WorkPulse /opt/workpulse/
```

```bash
sudo chmod +x /opt/workpulse/WorkPulse
```

2. Create a desktop entry for the application launcher:
```bash
nano ~/.local/share/applications/workpulse.desktop
```

3. Refresh the launcher:
```bash
update-desktop-database ~/.local/share/applications/
```

4. Open the app from the application launcher by searching **`NIST Workspace`**

## Ubuntu (Build + Install)
```bash
dotnet publish "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/WorkPulse/WorkPulse.csproj" -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true && sudo cp "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/WorkPulse/bin/Release/net8.0/linux-x64/publish/WorkPulse" /opt/workpulse/WorkPulse
```

## Windows EXE: (Build)
```bash
dotnet publish "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/WorkPulse/WorkPulse.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

### Windows EXE Output Location:
```bash
WorkPulse/bin/Release/net8.0/win-x64/publish/WorkPulse.exe
```


### Windows Users

1. Create a folder: `C:\Program Files\WorkPulse\`

2. Copy `WorkPulse.exe` from `WorkPulse/bin/Release/net8.0/win-x64/publish` into it

3. Create a Desktop Shortcut:
    - Right-click `Desktop -> New -> Shortcut`
    - Target: `C:\Program Files\WorkPulse\WorkPulse.exe`
    - Name: **`NIST Workspace`**

4. *(Optional)* Pin to `Start Menu`: Open Start Menu, search **`NIST Workspace`**, right-click -> `Pin to Start`

| Note: Both build are self-contained. No `.NET` runtime installation is required on the target machine.


### Data Storage

Attendance data is stored as JSON (JavaScript Object Notation) files (one file per month) at:

* **Ubuntu**: `~/.local/share/WorkPulse/`
* **Windows**: `%LOCALAPPDATA%/WorkPulse/`

