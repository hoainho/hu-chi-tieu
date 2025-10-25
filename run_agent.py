# run_agent.py
from qwen_agent.agents import Assistant

# Cấu hình model: Ollama expose OpenAI-compatible API ở localhost:11434
llm_cfg = {
    "model": "qwen3-coder:30b",         # Tên model đúng theo Ollama
    "model_server": "http://localhost:11434/v1",  # API base của Ollama
    "api_key": "EMPTY"                  # Ollama không cần key, nhưng Qwen-Agent yêu cầu field
}

# Mô tả vai trò
system_instruction = "You are a professional coding assistant. Help write, debug, and explain code."

agent = Assistant(
    llm_cfg=llm_cfg,
    system_instruction=system_instruction
)

# Test CLI chat
print("🚀 Qwen Agent (Coding Mode) is ready!\n")
while True:
    prompt = input("👤 You: ")
    if prompt.lower() in ["exit", "quit"]:
        break
    response = agent.chat(prompt)
    print("🤖 Agent:", response)
