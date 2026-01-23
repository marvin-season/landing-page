
import json
from scheam import ProseMirrorDoc

# 获取 Schema 的字符串表示
schema_str = ProseMirrorDoc.model_json_schema()

instructions = [
    "You need to wrap the answer in a JSON object that follows the ProseMirror JSON Schema.",
    "Example: ",
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello world"}]}]}'
]