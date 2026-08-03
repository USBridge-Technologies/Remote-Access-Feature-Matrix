import json
import argparse
import os
import glob
from pathlib import Path

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def get_schema_keys(filepath):
    """Loads a schema file (list of objects) and returns a list of names."""
    if not os.path.exists(filepath):
        return []
    data = load_json(filepath)
    return [item["name"] for item in data if "name" in item]

def deep_merge(target, source):
    """Deep merges source into target."""
    for key, value in source.items():
        if isinstance(value, dict) and key in target and isinstance(target[key], dict):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target

def sync_schemas():
    print("Synchronizing and sorting JSON files...")
    schemas_soft = {
        "features": get_schema_keys("docs/software/features.json"),
        "os": get_schema_keys("docs/software/os.json"),
        "hardware": get_schema_keys("docs/software/hardware.json"),
        "pricing": get_schema_keys("docs/software/pricing.json")
    }
    schemas_kvm = {
        "features": get_schema_keys("docs/kvm/features.json"),
        "os": get_schema_keys("docs/kvm/os.json"),
        "hardware": get_schema_keys("docs/kvm/hardware.json"),
        "pricing": get_schema_keys("docs/kvm/pricing.json")
    }
    # Caches for providers.json
    providers_list_soft = load_json("docs/software/providers.json")
    providers_list_kvm = load_json("docs/kvm/providers.json")
    
    # Find all provider JSONs
    provider_files = []
    provider_files.extend(glob.glob("docs/software/providers/*.json"))
    provider_files.extend(glob.glob("docs/kvm/providers/*.json"))
    
    for filepath in provider_files:
        if os.path.basename(filepath) in ["providers.json", "draft.json"]:
            continue
            
        data = load_json(filepath)
        prov_key = data.get("key")
        if not prov_key:
            prov_key = os.path.splitext(os.path.basename(filepath))[0]
            
        prov_type = data.get("type")
        # Default to checking path if type is missing
        is_kvm_path = "kvm" in filepath.split(os.sep) or "kvm/" in filepath or "kvm\\" in filepath
        
        if prov_type == "kvm":
            target_dir = "docs/kvm/providers"
            is_kvm = True
        elif prov_type == "software":
            target_dir = "docs/software/providers"
            is_kvm = False
        else:
            is_kvm = is_kvm_path
            target_dir = "docs/kvm/providers" if is_kvm else "docs/software/providers"
            data["type"] = "kvm" if is_kvm else "software" # Auto-inject type if missing
            
        # Move file if it's in the wrong directory
        target_filepath = os.path.join(target_dir, f"{prov_key}.json")
        target_filepath = target_filepath.replace("\\", "/") # Normalize path
        filepath_norm = filepath.replace("\\", "/")
        
        if filepath_norm != target_filepath:
            print(f"Moving {filepath} -> {target_filepath}")
            if os.path.exists(filepath):
                os.rename(filepath, target_filepath)
            filepath = target_filepath
            
        # Register in providers.json if not present
        if is_kvm:
            if prov_key not in providers_list_kvm:
                providers_list_kvm.append(prov_key)
                save_json(providers_list_kvm, "docs/kvm/providers.json")
                print(f"Added new KVM provider to index: {prov_key}")
            asset_dir = f"docs/asset/kvm/{prov_key}"
        else:
            if prov_key not in providers_list_soft:
                providers_list_soft.append(prov_key)
                save_json(providers_list_soft, "docs/software/providers.json")
                print(f"Added new Software provider to index: {prov_key}")
            asset_dir = f"docs/asset/soft/{prov_key}"
            
        # Create asset directory if it doesn't exist
        if not os.path.exists(asset_dir):
            os.makedirs(asset_dir)
            # Create an empty .gitkeep file so git tracks the empty folder
            with open(os.path.join(asset_dir, ".gitkeep"), "w") as f:
                f.write("")
            print(f"Created media folder: {asset_dir}")

        schemas = schemas_kvm if is_kvm else schemas_soft
        changed = False
        
        for section, ordered_keys in schemas.items():
            if section not in data:
                data[section] = {}
                
            current_section = data[section]
            new_section = {}
            
            # 1. Add all keys from schema in the correct order
            for key in ordered_keys:
                if key in current_section:
                    new_section[key] = current_section[key]
                else:
                    new_section[key] = {"status": "UNKNOWN", "comment": ""}
                    changed = True
            
            # 2. Append any extra keys that are not in the schema (just in case)
            for key in current_section:
                if key not in new_section:
                    new_section[key] = current_section[key]
            
            # Update the section if the order or content changed
            if list(current_section.keys()) != list(new_section.keys()):
                changed = True
            
            data[section] = new_section
        
        # Enforce standard order for top-level keys
        ordered_data = {}
        for k in ["name", "key", "type", "website", "github", "description"]:
            if k in data:
                ordered_data[k] = data.pop(k)
        
        # Add back sections and any remaining keys
        for k, v in data.items():
            ordered_data[k] = v
            
        data = ordered_data
        
        # Save always to ensure consistent formatting (indent=2)
        print(f"Updating and formatting: {filepath}")
        save_json(data, filepath)

    print("Synchronization completed successfully!")

def merge_draft(draft_path, target_path):
    if not os.path.exists(draft_path):
        print(f"Error: File {draft_path} not found.")
        return
    if not os.path.exists(target_path):
        print(f"Error: File {target_path} not found.")
        return
        
    print(f"Merging data from {draft_path} into {target_path}...")
    draft_data = load_json(draft_path)
    target_data = load_json(target_path)
    
    # Support for UI diff format (changes)
    if "changes" in draft_data:
        changes = draft_data["changes"]
        for section, params in changes.items():
            if section not in target_data:
                target_data[section] = {}
            for param_name, edits in params.items():
                if param_name not in target_data[section]:
                    target_data[section][param_name] = {}
                
                if "status" in edits and "after" in edits["status"]:
                    target_data[section][param_name]["status"] = edits["status"]["after"]
                
                if "comment" in edits and "after" in edits["comment"]:
                    target_data[section][param_name]["comment"] = edits["comment"]["after"]
    else:
        # Fallback: standard deep_merge for full JSON
        deep_merge(target_data, draft_data)
    
    save_json(target_data, target_path)
    print("Merge completed successfully!")

def apply_draft():
    draft_path = "scripts/draft.json"
    if not os.path.exists(draft_path):
        sync_schemas()
        return
        
    try:
        draft_data = load_json(draft_path)
    except Exception:
        draft_data = {}
        
    if "_meta" in draft_data and "target" in draft_data["_meta"] and "tab" in draft_data["_meta"]:
        print("Detected new parameter draft. Adding to schema...")
        meta = draft_data.pop("_meta")
        target = meta["target"]
        tab = meta["tab"]
        
        schema_dir = "docs/kvm" if target == "kvm" else "docs/software"
        schema_path = f"{schema_dir}/{tab}.json"
        
        if os.path.exists(schema_path):
            schema = load_json(schema_path)
            if not any(p.get("name") == draft_data.get("name") for p in schema):
                schema.append(draft_data)
                save_json(schema, schema_path)
                print(f"Added new parameter '{draft_data.get('name')}' to {schema_path}")
                
                # Now update all provider files with the new param default
                param_type = draft_data.get("type", "boolean")
                param_name = draft_data.get("name")
                default_value = None if param_type == "boolean" else "UNKNOWN"
                
                providers_dir = os.path.join(schema_dir, "providers")
                provider_files = glob.glob(os.path.join(providers_dir, "*.json"))
                
                for file_path in provider_files:
                    with open(file_path, "r", encoding="utf-8") as f:
                        provider_data = json.load(f)
                        
                    if tab not in provider_data:
                        provider_data[tab] = {}

                    if param_name not in provider_data[tab]:
                        provider_data[tab][param_name] = default_value
                        save_json(provider_data, file_path)
                
        save_json({"name": "", "key": "", "changes": {}}, draft_path)
        sync_schemas()
        return
    
    if "key" in draft_data and draft_data["key"]:
        provider_key = draft_data["key"]
        provider_type = draft_data.get("type")
        
        if provider_type == "kvm":
            target_path = f"docs/kvm/providers/{provider_key}.json"
        elif provider_type == "software":
            target_path = f"docs/software/providers/{provider_key}.json"
        else:
            target_path = f"docs/software/providers/{provider_key}.json"
            if not os.path.exists(target_path):
                target_path = f"docs/kvm/providers/{provider_key}.json"
            
        if not os.path.exists(target_path):
            print(f"Creating new provider file: {target_path}")
            save_json(draft_data, target_path)
            save_json({"name": "", "key": "", "changes": {}}, draft_path)
        else:
            merge_draft(draft_path, target_path)
            save_json({"name": "", "key": "", "changes": {}}, draft_path)
        
        sync_schemas()
    else:
        if draft_data and "changes" in draft_data:
            print("Warning: No 'key' field in draft.json, applying basic synchronization only.")
        sync_schemas()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automation of provider data updates")
    parser.add_argument("--sync", action="store_true", help="Synchronize all JSON files with schemas and clean up")
    parser.add_argument("--merge", type=str, help="Path to JSON file (draft) to merge")
    parser.add_argument("--target", type=str, help="Path to target provider file (e.g. docs/software/providers/rustdesk.json)")
    parser.add_argument("--apply-draft", action="store_true", help="Automatically apply script to scripts/draft.json")
    
    args = parser.parse_args()
    
    if args.sync:
        sync_schemas()
    elif args.apply_draft:
        apply_draft()
    elif args.merge and args.target:
        merge_draft(args.merge, args.target)
    else:
        parser.print_help()
