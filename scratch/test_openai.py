import os
from openai import OpenAI

# Use invalid base URL to trigger connection error
client = OpenAI(api_key="fake_key", base_url="https://invalid-api-domain-12345.com/v1")
try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello"}]
    )
except Exception as e:
    print("Error Type:", type(e))
    print("Error String:", str(e))
    print("Error Repr:", repr(e))
