import subprocess
import sys

def seed_all():
    print("=== SEEDING DATABASE ===")
    
    scripts = [
        "app.seed_pricing_plans",
        "app.seed_bundles",
        "app.seed_department",
        "app.seed_admin"
    ]
    
    for script in scripts:
        print(f"\nRunning {script}...")
        res = subprocess.run([sys.executable, "-m", script])
        if res.returncode == 0:
            print(f"Successfully completed {script}.")
        else:
            print(f"Failed to run {script}.")
            
    print("\n=== SEEDING COMPLETED ===")

if __name__ == "__main__":
    seed_all()
