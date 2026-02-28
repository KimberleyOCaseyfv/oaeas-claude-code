#!/usr/bin/env python3
"""
OAEAS + Claude Code Multi-Agent Integration
OpenClaw Agent Evolution Assessment System with AI Code Generation

Author: Luck (OpenClaw Agent)
Date: 2026-02-28
Version: 1.0.0
"""

import os
import json
import subprocess
import asyncio
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass
from datetime import datetime

# Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
WORKING_DIR = os.getenv("OAEAS_WORKING_DIR", ".")


@dataclass
class CodeGenerationResult:
    """代码生成结果"""
    success: bool
    code: str
    provider: str
    tokens_used: int
    execution_time: float
    error: Optional[str] = None


@dataclass
class AssessmentResult:
    """评估结果"""
    agent_id: str
    overall_score: float
    level: str  # Novice/Proficient/Expert/Master
    dimensions: Dict[str, float]
    recommendations: List[str]
    timestamp: datetime


class ClaudeCodeMultiAgent:
    """
    Claude Code Multi-Agent 协作集成
    
    5个角色协作:
    - Architect: 系统设计
    - Coder: 代码实现
    - Reviewer: 代码审查
    - Tester: 测试生成
    - Documenter: 文档编写
    """
    
    def __init__(self, working_dir: str = "."):
        self.working_dir = working_dir
        self.personas = {
            "architect": {
                "name": "Architect",
                "description": "Senior software architect specializing in scalable system design",
                "prompt_prefix": "You are a senior software architect. Design scalable, maintainable systems with clear architecture diagrams and component breakdowns."
            },
            "coder": {
                "name": "Coder", 
                "description": "Expert developer focused on clean, efficient code",
                "prompt_prefix": "You are an expert developer. Write clean, efficient, production-ready code with proper error handling, type hints, and comments."
            },
            "reviewer": {
                "name": "Reviewer",
                "description": "Meticulous code reviewer ensuring quality",
                "prompt_prefix": "You are a meticulous code reviewer. Find issues, suggest improvements, check for security vulnerabilities and performance bottlenecks."
            },
            "tester": {
                "name": "Tester", 
                "description": "QA engineer ensuring comprehensive test coverage",
                "prompt_prefix": "You are a QA engineer. Write comprehensive tests covering unit, integration, and edge cases. Aim for >90% coverage."
            },
            "documenter": {
                "name": "Documenter",
                "description": "Technical writer creating clear documentation",
                "prompt_prefix": "You are a technical writer. Create clear, helpful documentation with examples, API references, and usage guides."
            }
        }
    
    async def architect_design(self, requirements: str) -> str:
        """
        Architect角色: 设计系统架构
        
        Args:
            requirements: 系统需求描述
            
        Returns:
            架构设计文档
        """
        persona = self.personas["architect"]
        
        prompt = f"""{persona['prompt_prefix']}

Design a system architecture for the following requirements:

{requirements}

Please provide:
1. High-level architecture overview
2. Component breakdown and responsibilities  
3. Technology stack recommendations
4. Data flow description
5. API design (if applicable)
6. Database schema suggestions
7. Scalability considerations
8. Security best practices

Format: Markdown with clear sections and diagrams (ASCII art if helpful)."""

        return await self._call_claude_code(prompt, persona["name"])
    
    async def coder_implement(self, design: str, feature: str, language: str = "python") -> str:
        """
        Coder角色: 实现代码
        
        Args:
            design: 架构设计文档
            feature: 具体功能描述
            language: 编程语言
            
        Returns:
            实现代码
        """
        persona = self.personas["coder"]
        
        prompt = f"""{persona['prompt_prefix']}

Based on this design:
```
{design}
```

Implement the following feature:
{feature}

Requirements:
- Language: {language}
- Write clean, maintainable, production-ready code
- Include proper error handling
- Add type hints (if language supports)
- Write docstrings/comments for complex logic
- Follow best practices and conventions
- Include example usage

Output: Complete, runnable code with file structure suggestions."""

        return await self._call_claude_code(prompt, persona["name"])
    
    async def reviewer_check(self, code: str, context: str = "") -> Dict:
        """
        Reviewer角色: 代码审查
        
        Args:
            code: 待审查代码
            context: 上下文信息
            
        Returns:
            审查报告
        """
        persona = self.personas["reviewer"]
        
        prompt = f"""{persona['prompt_prefix']}

Review the following code:

```python
{code}
```

Context: {context}

Provide a detailed review in JSON format:
{{
    "overall_score": 8.5,
    "issues": [
        {{
            "severity": "high/medium/low",
            "category": "security/performance/maintainability",
            "description": "Issue description",
            "suggestion": "How to fix"
        }}
    ],
    "strengths": ["What's done well"],
    "improvements": ["Suggested improvements"],
    "security_concerns": ["Security issues"],
    "performance_notes": ["Performance considerations"]
}}"""

        result = await self._call_claude_code(prompt, persona["name"])
        try:
            return json.loads(result)
        except:
            return {"raw_review": result, "overall_score": 7.0}
    
    async def tester_generate(self, code: str, requirements: str) -> str:
        """
        Tester角色: 生成测试
        
        Args:
            code: 被测试代码
            requirements: 需求描述
            
        Returns:
            测试代码
        """
        persona = self.personas["tester"]
        
        prompt = f"""{persona['prompt_prefix']}

For this code:
```python
{code}
```

Requirements:
{requirements}

Generate comprehensive tests:
1. Unit tests for all functions
2. Integration tests
3. Edge case tests
4. Error handling tests
5. Performance tests (if applicable)

Use pytest framework. Include:
- Test fixtures
- Parameterized tests
- Mock/stub examples
- Coverage comments

Aim for >90% code coverage."""

        return await self._call_claude_code(prompt, persona["name"])
    
    async def documenter_create_docs(self, code: str, api_endpoints: List[str] = None) -> str:
        """
        Documenter角色: 编写文档
        
        Args:
            code: 代码
            api_endpoints: API端点列表
            
        Returns:
            文档
        """
        persona = self.personas["documenter"]
        
        api_section = ""
        if api_endpoints:
            api_section = f"\nAPI Endpoints: {', '.join(api_endpoints)}"
        
        prompt = f"""{persona['prompt_prefix']}

Document the following code:

```python
{code}
```
{api_section}

Create:
1. README with installation and usage
2. API documentation (if applicable)
3. Code examples
4. Configuration guide
5. Troubleshooting section

Format: Markdown, professional style."""

        return await self._call_claude_code(prompt, persona["name"])
    
    async def full_development_workflow(self, requirements: str, language: str = "python") -> Dict:
        """
        完整的多角色协作开发流程
        
        Args:
            requirements: 需求描述
            language: 编程语言
            
        Returns:
            完整开发成果
        """
        print("🎭 Starting Multi-Agent Development Workflow...")
        print("=" * 60)
        
        results = {}
        
        # Step 1: Architect设计
        print("\n[1/5] 🏗️  Architect designing system...")
        design = await self.architect_design(requirements)
        results["design"] = design
        print("✅ Architecture design complete")
        
        # Step 2: Coder实现
        print("\n[2/5] 💻  Coder implementing...")
        code = await self.coder_implement(design, requirements, language)
        results["code"] = code
        print("✅ Code implementation complete")
        
        # Step 3: Reviewer审查
        print("\n[3/5] 🔍  Reviewer checking code...")
        review = await self.reviewer_check(code, requirements)
        results["review"] = review
        print(f"✅ Code review complete (Score: {review.get('overall_score', 'N/A')})")
        
        # Step 4: 根据审查优化
        if review.get('overall_score', 10) < 8:
            print("\n[3.5/5] 🔄  Improving based on review...")
            code = await self._improve_code(code, review)
            results["improved_code"] = code
            print("✅ Code improvements applied")
        
        # Step 5: Tester生成测试
        print("\n[4/5] 🧪  Tester generating tests...")
        tests = await self.tester_generate(code, requirements)
        results["tests"] = tests
        print("✅ Test generation complete")
        
        # Step 6: Documenter编写文档
        print("\n[5/5] 📝  Documenter writing docs...")
        docs = await self.documenter_create_docs(code)
        results["docs"] = docs
        print("✅ Documentation complete")
        
        print("\n" + "=" * 60)
        print("🎉 Multi-Agent Development Complete!")
        print("=" * 60)
        
        return results
    
    async def _call_claude_code(self, prompt: str, persona_name: str) -> str:
        """
        调用Claude Code CLI
        
        Args:
            prompt: 提示词
            persona_name: 角色名称
            
        Returns:
            Claude Code输出
        """
        # 设置环境变量
        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY
        
        cmd = [
            "claude-code",
            "--working-dir", self.working_dir,
            "--message", f"[{persona_name}] {prompt}"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5分钟超时
                env=env
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error: {result.stderr}"
                
        except subprocess.TimeoutExpired:
            return "Error: Timeout after 5 minutes"
        except Exception as e:
            return f"Error: {str(e)}"
    
    async def _improve_code(self, code: str, review: Dict) -> str:
        """根据审查意见改进代码"""
        suggestions = review.get('improvements', [])
        issues = review.get('issues', [])
        
        prompt = f"""Improve this code based on review feedback:

Original Code:
```python
{code}
```

Issues to fix:
{json.dumps(issues, indent=2)}

Suggested improvements:
{json.dumps(suggestions, indent=2)}

Provide the improved version addressing all critical issues."""

        return await self._call_claude_code(prompt, "Coder")


# 使用示例
async def main():
    """主函数示例"""
    
    print("🚀 OAEAS + Claude Code Multi-Agent Integration")
    print("=" * 60)
    
    # 初始化
    team = ClaudeCodeMultiAgent(working_dir="./oaeas-project")
    
    # 示例需求: 开发OAEAS评估API
    requirements = """
Create a FastAPI-based Agent Assessment API with the following features:
1. POST /assess - Submit agent assessment data
2. GET /assess/{agent_id} - Get assessment results
3. GET /assess/{agent_id}/radar - Get radar chart data
4. GET /ranking - Get global agent rankings
5. POST /recommendations - Get evolution recommendations

Requirements:
- PostgreSQL database
- JWT authentication
- Rate limiting
- Comprehensive error handling
- OpenAPI documentation
"""
    
    # 执行完整开发流程
    results = await team.full_development_workflow(requirements, language="python")
    
    # 保存结果
    output_dir = "./generated"
    os.makedirs(output_dir, exist_ok=True)
    
    with open(f"{output_dir}/architecture.md", "w") as f:
        f.write(results["design"])
    
    with open(f"{output_dir}/main.py", "w") as f:
        f.write(results["code"])
    
    with open(f"{output_dir}/test_main.py", "w") as f:
        f.write(results["tests"])
    
    with open(f"{output_dir}/README.md", "w") as f:
        f.write(results["docs"])
    
    print(f"\n📁 Results saved to: {output_dir}/")
    print("\nGenerated files:")
    print("  - architecture.md (System design)")
    print("  - main.py (Implementation)")
    print("  - test_main.py (Tests)")
    print("  - README.md (Documentation)")


if __name__ == "__main__":
    # 检查API Key
    if not ANTHROPIC_API_KEY:
        print("❌ Error: ANTHROPIC_API_KEY not set")
        print("Please set it with: export ANTHROPIC_API_KEY='your-key'")
        exit(1)
    
    # 运行
    asyncio.run(main())
