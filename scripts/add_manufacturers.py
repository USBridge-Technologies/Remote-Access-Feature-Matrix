import json
import glob
import os

mapping = {
    "jetkvm": "JetKVM",
    "pikvm-v4-plus": "PiKVM",
    "usbridgekvm2.0": "USBridge Technologies",
    
    "anydesk": "AnyDesk Software GmbH",
    "apache-guacamole": "Apache Software Foundation",
    "apple-remote-desktop": "Apple Inc.",
    "chrome-remote-desktop": "Google LLC",
    "citrix-hdx-ica": "Cloud Software Group",
    "connectwise-screenconnect": "ConnectWise",
    "dwservice": "DWService",
    "gotomypc": "GoTo",
    "hp-teradici-pcoip": "HP (Teradici)",
    "logmein-resolve": "GoTo",
    "meshcentral": "Open Source",
    "microsoft-rdp": "Microsoft Corporation",
    "moonlight-sunshine": "Open Source",
    "nomachine-nx": "NoMachine",
    "parsec": "Unity Technologies",
    "realvnc-connect": "RealVNC Limited",
    "rustdesk": "RustDesk",
    "spice": "Red Hat (Open Source)",
    "splashtop": "Splashtop Inc.",
    "ssh-x11-forwarding": "OpenBSD (OpenSSH)",
    "teamviewer": "TeamViewer Germany GmbH",
    "tightvnc": "GlavSoft LLC",
    "todesk": "ToDesk",
    "usbridge": "USBridge Technologies",
    "vmware-blast-extreme": "Broadcom",
    "x2go": "X2Go Project"
}

for f in glob.glob('docs/*/providers/*.json'):
    if "draft.json" in f:
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    key = data.get("key")
    if key in mapping:
        data["manufacturer"] = mapping[key]
    else:
        data["manufacturer"] = "Unknown"
        
    with open(f, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
        file.write("\n")
