"""
Groq LLM Client for Feature Explorer
- Full conversation history
- Rich architecture context
- Structured output hints
"""
import os
import json
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict

try:
    from dotenv import load_dotenv
    # Search from this file's directory upward so .env is found
    # regardless of where Django's working directory is
    _here = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_here, '..', '.env'))  # project root
    load_dotenv(os.path.join(_here, '.env'))        # app dir fallback
    load_dotenv()                                    # cwd fallback
except ImportError:
    pass

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


SYSTEM_BASE = """You are an expert AI assistant embedded in Feature Explorer — a visual Feast feature store architecture tool.

You help data engineers, ML engineers, and data scientists design, review, and improve Feast feature stores.

CAPABILITIES:
- Answer questions about the current repository architecture
- Generate valid Feast Python code (entities, feature views, services, data sources)
- Identify issues, anti-patterns, and optimisations
- Explain data lineage and feature dependencies
- Suggest node changes with structured ACTION blocks

RESPONSE RULES:
- Be concise and direct — users are technical
- Always use fenced code blocks with language tags: ```python, ```yaml, ```json
- When suggesting a change to the diagram, emit a structured ACTION block (see format below)
- Reference specific node names from the context when relevant
- Do NOT make up node names that aren't in the context

ACTION BLOCK FORMAT (use when you want to highlight/select nodes or propose changes):
When you want the user to focus on specific nodes, end your message with:
```action
{
  "type": "highlight",           // "highlight" | "select" | "edit_suggestion"
  "nodes": ["node_id_1"],        // list of node IDs from context
  "reason": "Why these nodes",
  "edit": {                      // only for edit_suggestion
    "node_id": "...",
    "field": "description",      // field to change
    "value": "new value",
    "confirm_message": "Update description of X to '...'?"
  }
}
```

Only emit one ACTION block per response. Only reference node IDs that exist in the context.
"""

QUERY_ADDONS = {
    "generate_code": "\n\nFocus: Generate complete, runnable Feast Python code. Include imports.",
    "optimize": "\n\nFocus: Performance — TTL tuning, materialization strategy, online vs offline split, entity cardinality.",
    "lineage": "\n\nFocus: Trace data flow step by step from sources through entities and feature views to services.",
    "validate": "\n\nFocus: Check for missing connections, orphaned nodes, bad TTLs, entity mismatches, anti-patterns.",
    "default": "",
}


def build_rich_context(repo, selected_node_id: Optional[str] = None) -> str:
    """Build a detailed text context from the repository architecture JSON."""
    if not repo:
        return "No repository loaded."

    arch = repo.architecture_json or {}
    nodes_raw = arch.get("nodes", [])
    edges_raw = arch.get("edges", [])

    # Parse nodes — stored as [[id, obj], ...]
    nodes = {}
    if isinstance(nodes_raw, list):
        for item in nodes_raw:
            if isinstance(item, list) and len(item) == 2:
                nodes[item[0]] = item[1]
            elif isinstance(item, dict) and "id" in item:
                nodes[item["id"]] = item
    elif isinstance(nodes_raw, dict):
        nodes = nodes_raw

    edges = edges_raw if isinstance(edges_raw, list) else []

    lines = [
        f"Repository: {repo.name}",
        f"Location: {getattr(repo, 'location', 'N/A')}",
        f"Description: {(getattr(repo, 'description', '') or '')[:200]}",
        f"Nodes: {len(nodes)}  Edges: {len(edges)}",
        "",
    ]

    # Group by type
    by_type = {"datasource": [], "entity": [], "featureview": [], "service": []}
    for nid, n in nodes.items():
        t = n.get("type", "unknown")
        if t in by_type:
            by_type[t].append((nid, n))

    def fmt_tags(tags):
        return (" [" + ", ".join(tags) + "]") if tags else ""

    # Data sources
    if by_type["datasource"]:
        lines.append("=== DATA SOURCES ===")
        for nid, n in by_type["datasource"]:
            db = n.get("dbType", {})
            lines.append(f'  [{nid}] {n["name"]} ({db.get("name", n.get("kind","?"))}){fmt_tags(n.get("tags",[]))}')
            if n.get("description"):
                lines.append(f'    desc: {n["description"][:120]}')
            if n.get("ownedBy"):
                lines.append(f'    owner: {n["ownedBy"]}')
        lines.append("")

    # Entities
    if by_type["entity"]:
        lines.append("=== ENTITIES ===")
        for nid, n in by_type["entity"]:
            lines.append(f'  [{nid}] {n["name"]}  join_key={n.get("joinKey","?")}')
        lines.append("")

    # Feature views
    if by_type["featureview"]:
        lines.append("=== FEATURE VIEWS ===")
        for nid, n in by_type["featureview"]:
            feats = n.get("features", [])
            ttl = n.get("details", {}).get("ttl", "?")
            lines.append(f'  [{nid}] {n["name"]}  type={n.get("subtype","?")}  ttl={ttl}s  features={len(feats)}{fmt_tags(n.get("tags",[]))}')
            if n.get("description"):
                lines.append(f'    desc: {n["description"][:120]}')
            # List features with key metadata
            for f in feats[:8]:
                fname = f.get("name", str(f)) if isinstance(f, dict) else str(f)
                ftype = f.get("type", "") if isinstance(f, dict) else ""
                pii   = " [PII]" if isinstance(f, dict) and f.get("security", {}).get("pii") else ""
                online = " [online]" if isinstance(f, dict) and f.get("serving", {}).get("online") else ""
                lines.append(f'    - {fname}: {ftype}{pii}{online}')
            if len(feats) > 8:
                lines.append(f'    ... and {len(feats)-8} more features')
            lines.append("")

    # Services
    if by_type["service"]:
        lines.append("=== FEATURE SERVICES ===")
        for nid, n in by_type["service"]:
            fv_ids = n.get("features", [])
            fv_names = [nodes.get(fid, {}).get("name", fid) for fid in fv_ids]
            lines.append(f'  [{nid}] {n["name"]}  views=[{", ".join(fv_names)}]')
        lines.append("")

    # Edges
    if edges:
        lines.append("=== CONNECTIONS ===")
        for e in edges[:20]:
            frm = nodes.get(e.get("from", ""), {}).get("name", e.get("from", "?"))
            to  = nodes.get(e.get("to", ""),   {}).get("name", e.get("to",  "?"))
            lines.append(f'  {frm} → {to}')
        if len(edges) > 20:
            lines.append(f'  ... and {len(edges)-20} more connections')
        lines.append("")

    # Selected node detail
    if selected_node_id and selected_node_id in nodes:
        n = nodes[selected_node_id]
        lines.append(f"=== CURRENTLY SELECTED: {n['name']} [{selected_node_id}] ===")
        lines.append(json.dumps(n, indent=2, default=str)[:1500])

    return "\n".join(lines)


class GroqLLMClient:
    DEFAULT_MODEL = "llama-3.3-70b-versatile"

    def __init__(self, api_key: Optional[str] = None):
        if not GROQ_AVAILABLE:
            raise RuntimeError(
                "groq package not installed. Run: pip install groq"
            )
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "GROQ_API_KEY not found. Checked environment and .env file. "
                f"Env vars present: {[k for k in os.environ if 'GROQ' in k or 'API' in k]}"
            )
        self.client = Groq(api_key=self.api_key)

    def query(
        self,
        message: str,
        history: List[Dict],           # [{"role": "user"|"assistant", "content": "..."}]
        repo=None,
        selected_node_id: Optional[str] = None,
        query_type: str = "default",
    ) -> Dict:
        """Query Groq with full conversation history and rich context."""

        # Build system prompt
        system = SYSTEM_BASE + QUERY_ADDONS.get(query_type, "")
        arch_context = build_rich_context(repo, selected_node_id)
        system += f"\n\n=== CURRENT ARCHITECTURE CONTEXT ===\n{arch_context}\n==="

        # Build messages: history + current
        messages = [{"role": "system", "content": system}]
        for h in history[-20:]:          # keep last 20 turns (10 exchanges)
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        completion = self.client.chat.completions.create(
            model=self.DEFAULT_MODEL,
            messages=messages,
            temperature=0.6,
            max_completion_tokens=2048,
        )

        response_text = completion.choices[0].message.content

        return {
            "response": response_text,
            "model": self.DEFAULT_MODEL,
            "usage": {
                "prompt_tokens":     completion.usage.prompt_tokens     if completion.usage else 0,
                "completion_tokens": completion.usage.completion_tokens if completion.usage else 0,
                "total_tokens":      completion.usage.total_tokens      if completion.usage else 0,
            },
            "query_type": query_type,
        }

    def quick_query(self, message: str) -> str:
        return self.query(message, history=[])["response"]


_llm_client = None

def get_llm_client():
    global _llm_client
    if _llm_client is None:
        _llm_client = GroqLLMClient()
    return _llm_client
