# Personalized Attendance Management System

A cross-platform desktop application for managing daily attendance records, overtime tracking and Excel based reporting. 

## Implemented Features

### Attendance Tracking 

- Recording daily login and logout times
- Automatic day-of-week detection from selected date
- Supporting multiple day types
 
### Overtime Management

- Overtime calculation 
- Overtime end time picker for precise duration calculation


### Edit Mode

- Toggle between `View Mode` and `Edit Mode`
- **CRUD** Operations on buttons involving New Entry (Create), Update / Modify, Delete : Hidden in `View Mode` and visible only in `Edit Mode`
- Save button persiss all changes to disk and exits `Edit Mode`
- Unsaved changes warning on close with 3 options: `Save & Close`, `Go Back`, `Discard & Close`


### Excel Import / Export

- **Import**: Load an exisiting data records (exisiting Excel files : `.xlsx`)
    - Auto detections of month sections, work days, holidays, weekends and overtime flags

- **Export**: Generate formatted Excel reports with:
    - Month labels, weekly grouping and summary rows
    - Color coded overtime labels
    - Overtime count and total duration summary


### Monthly Navigation 

- Browse attendance data records by month using navigation (left / right) arrows
- Summary panel showing: `Work Days Count`, `Overtime Count`, `Total Overtime Duration`


## `Setup Guide - Run on Local Machine [Ubuntu / Windows]`

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
dotnet publish NistAttendance/NistAttendance.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

4. Build for `Windows`
```bash
dotnet publish NistAttendance/NistAttendance.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

## `Deployment on Local Machine [Ubuntu / Windows]`


### Ubuntu Users

1. Copy the binary to a permanent location:
```bash 
sudo mkdir -p /opt/nist-attendance
```

```bash
sudo cp NistAttendance/bin/Release/net8.0/linux-x64/publish/NistAttendance /opt/nist-attendance/
```

```bash
sudo chmod +x /opt/nist-attendance/NistAttendance
```

2. Create a desktop entry for the application launcher:
```bash
nano ~/.local/share/applications/nist-attendance.desktop
```

3. Refresh the launcher:
```bash
update-desktop-database ~/.local/share/applications/
```

4. Open the app from the application launcher by searching **`NIST Attendance`**

## Ubuntu (Build + Install)
```bash
dotnet publish "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/NistAttendance/NistAttendance.csproj" -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true && sudo cp "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/NistAttendance/bin/Release/net8.0/linux-x64/publish/NistAttendance" /opt/nist-attendance/NistAttendance
```

## Windows EXE: (Build)
```bash
dotnet publish "/home/sankyo/Sachin Files/01 NIST - AEM979/NIST Projects/2026/NISTAttendanceManagementSystem/NistAttendance/NistAttendance.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

### Windows EXE Output Location:
```bash
NistAttendance/bin/Release/net8.0/win-x64/publish/NistAttendance.exe
```


### Windows Users

1. Create a folder: `C:\Program Files\NistAttendance\`

2. Copy `NistAttendance.exe` from `NistAttendance/bin/Release/net8.0/win-x64/publish` into it

3. Create a Desktop Shortcut:
    - Right-click `Desktop -> New -> Shortcut`
    - Target: `C:\Program Files\NistAttendance\NistAttendance.exe`
    - Name: **`NIST Attendance`**

4. *(Optional)* Pin to `Start Menu`: Open Start Menu, search **`NIST Attendance`**, right-click -> `Pin to Start`

| Note: Both build are self-contained. No `.NET` runtime installation is required on the target machine.


### Data Storage

Attendance data is stored as JSON (JavaScript Object Notation) files (one file per month) at:

* **Ubuntu**: `~/.local/share/NistAttendance/`
* **Windows**: `%LOCALAPPDATA%/NistAttendance/`

