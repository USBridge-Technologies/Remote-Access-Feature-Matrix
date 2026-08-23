import json
import glob

for f in glob.glob('docs/software/providers/*.json'):
    if "draft.json" in f:
        continue
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    if "manufacturer" in data:
        del data["manufacturer"]
        
    with open(f, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
        file.write("\n")
