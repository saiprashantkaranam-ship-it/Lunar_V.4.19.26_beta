import sys
import os
import webbrowser
import subprocess
import json
import time

def open_youtube(query=None):
    if query:
        url = f"https://www.youtube.com/results?search_query={query}"
    else:
        url = "https://www.youtube.com"
    webbrowser.open(url)
    return {"success": True, "message": f"Opening YouTube for {query if query else 'home'}"}

def open_app(app_name):
    try:
        if "chrome" in app_name.lower():
            subprocess.Popen(["start", "chrome"], shell=True)
        elif "notepad" in app_name.lower():
            subprocess.Popen(["start", "notepad"], shell=True)
        elif "calc" in app_name.lower():
            subprocess.Popen(["start", "calc"], shell=True)
        else:
            # Try to start as a general command
            subprocess.Popen(["start", app_name], shell=True)
        return {"success": True, "message": f"Opening {app_name}"}
    except Exception as e:
        return {"success": False, "message": str(e)}

def get_system_speed():
    # Placeholder for "speed boosting" logic or stats
    return {"cpu_percent": 15, "memory_percent": 45, "status": "Optimized"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "No command provided"}))
        sys.exit(1)

    cmd = sys.argv[1]
    args = sys.argv[2:]

    if cmd == "open_youtube":
        result = open_youtube(args[0] if args else None)
    elif cmd == "open_app":
        result = open_app(args[0] if args else "")
    elif cmd == "speed_check":
        result = get_system_speed()
    else:
        result = {"success": False, "message": "Unknown command"}

    print(json.dumps(result))
