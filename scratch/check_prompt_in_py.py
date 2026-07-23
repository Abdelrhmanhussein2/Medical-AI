import asyncio
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

from dotenv import load_dotenv

load_dotenv()

PROMPT_FILE_PATH = os.path.join("app", "prompts", "system_prompt.txt")
with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
    prompt = f.read()

print("Prompt character count:", len(prompt))
print("First 200 chars:")
print(prompt[:200])

print("\nDoes it contain Rule 3 correctly?")
import re
rule3 = re.search(r"3\..*?(?=\n4\.)", prompt, re.DOTALL)
if rule3:
    print(rule3.group(0))
else:
    print("Rule 3 not found!")
