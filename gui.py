from qwen_agent.agents import Assistant
from qwen_agent.gui import run_gui

llm_cfg = {
    "model": "qwen3-coder:30b",
    "model_server": "http://localhost:11434/v1",
    "api_key": "EMPTY",
}

agent = Assistant(
    llm=llm_cfg,
    system="You are Qwen, a coding assistant that helps write and review code."
)

run_gui(agent=agent, port=7860)

