[Setup]
AppName=Nuru Analytics
AppVersion=1.0
AppPublisher=Nuru Analytics Team
AppPublisherURL=https://nuru-analytics.com
AppSupportURL=https://nuru-analytics.com
AppUpdatesURL=https://nuru-analytics.com
DefaultDirName={autopf}\Nuru Analytics
DisableProgramGroupPage=yes
; Décommentez la ligne suivante si vous avez votre icône
; SetupIconFile=public\favicon.ico
OutputDir=installer_output
OutputBaseFilename=NuruAnalytics_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; IMPORTANT: Ajustez le chemin de la source selon le nom généré par PyInstaller
Source: "dist\NuruAnalytics.exe"; DestDir: "{app}"; Flags: ignoreversion
; Ajoutez tous les fichiers supplémentaires requis si vous n'utilisez pas le mode --onefile de PyInstaller

[Icons]
Name: "{autoprograms}\Nuru Analytics"; Filename: "{app}\NuruAnalytics.exe"
Name: "{autodesktop}\Nuru Analytics"; Filename: "{app}\NuruAnalytics.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\NuruAnalytics.exe"; Description: "{cm:LaunchProgram,Nuru Analytics}"; Flags: nowait postinstall skipifsilent
