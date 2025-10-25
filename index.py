from qwen_agent.agents import Assistant
from qwen_agent.tools.knowledge_base import KnowledgeBase

# Cấu hình LLM (vẫn dùng Ollama)
llm_cfg = {
    "model": "qwen3-coder:30b",
    "model_server": "http://localhost:11434/v1",
    "api_key": "EMPTY",
}

# Khởi tạo KnowledgeBase (chính là vector store)
kb = KnowledgeBase(persist_dir="./kb_store")  # nơi lưu embeddings

# Index project codebase (ví dụ dự án của bạn ở ~/projects/myapp)
kb.index_directory(
    dir_path="~/projects/myapp",
    file_extensions=[".js", ".ts", ".py", ".md"],  # loại file muốn index
    chunk_size=1500,  # chia nhỏ context hợp lý
    overlap=200
)

# Khởi tạo agent có khả năng RAG
agent = Assistant(llm_cfg=llm_cfg, system_instruction="You are a coding assistant with access to the project context.")

# Gắn knowledge base cho agent
agent.register_knowledge_base(kb)

# Giờ bạn có thể hỏi agent về toàn bộ code
print(agent.chat("Tệp nào chịu trách nhiệm gọi API login trong project này?"))
