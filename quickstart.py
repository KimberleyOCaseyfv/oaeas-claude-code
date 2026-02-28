#!/usr/bin/env python3
"""
快速开始示例 - OAEAS + Claude Code

这个示例展示如何使用多Agent协作开发一个简单的API
"""

import asyncio
import sys
sys.path.insert(0, '/root/.openclaw/workspace/bounty/oaeas-claude-code')

from oaeas_claude_code import ClaudeCodeMultiAgent


async def quick_start():
    """快速开始示例"""
    
    print("🚀 OAEAS + Claude Code Quick Start")
    print("=" * 60)
    
    # 检查API Key
    import os
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("\n❌ Error: ANTHROPIC_API_KEY not set!")
        print("\n请设置API Key:")
        print("  export ANTHROPIC_API_KEY='your-api-key'")
        print("\n获取API Key: https://console.anthropic.com")
        return
    
    # 初始化团队
    print("\n🎭 Initializing Multi-Agent Team...")
    team = ClaudeCodeMultiAgent(working_dir="./example-project")
    
    # 定义简单需求
    requirements = """
Create a simple Python script that:
1. Reads a CSV file
2. Calculates basic statistics (mean, median, std)
3. Generates a summary report
4. Saves results to a new CSV

Requirements:
- Use pandas for data processing
- Include error handling
- Add command-line arguments
- Include example usage
"""
    
    print("\n📝 Requirements:")
    print(requirements)
    print("\n" + "=" * 60)
    
    # 执行开发流程
    print("\n⏳ Starting development workflow...")
    print("(This may take 2-5 minutes)\n")
    
    try:
        results = await team.full_development_workflow(
            requirements=requirements,
            language="python"
        )
        
        # 显示结果摘要
        print("\n" + "=" * 60)
        print("✅ Development Complete!")
        print("=" * 60)
        
        print("\n📊 Results Summary:")
        print(f"  - Architecture: {len(results['design'])} chars")
        print(f"  - Code: {len(results['code'])} chars")
        print(f"  - Review Score: {results.get('review', {}).get('overall_score', 'N/A')}")
        print(f"  - Tests: {len(results['tests'])} chars")
        print(f"  - Docs: {len(results['docs'])} chars")
        
        # 保存结果
        import os
        output_dir = "./example-output"
        os.makedirs(output_dir, exist_ok=True)
        
        with open(f"{output_dir}/architecture.md", "w") as f:
            f.write(results["design"])
        
        with open(f"{output_dir}/script.py", "w") as f:
            f.write(results["code"])
        
        with open(f"{output_dir}/test_script.py", "w") as f:
            f.write(results["tests"])
        
        with open(f"{output_dir}/README.md", "w") as f:
            f.write(results["docs"])
        
        print(f"\n📁 Files saved to: {output_dir}/")
        print("\nGenerated files:")
        print("  📄 architecture.md - System design")
        print("  💻 script.py - Main implementation")
        print("  🧪 test_script.py - Unit tests")
        print("  📖 README.md - Documentation")
        
        print("\n" + "=" * 60)
        print("🎉 Quick Start Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Check the generated files in ./example-output/")
        print("  2. Run the script: python3 example-output/script.py")
        print("  3. Run tests: pytest example-output/test_script.py")
        print("\n💡 Try modifying the requirements and run again!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check ANTHROPIC_API_KEY is set correctly")
        print("  2. Ensure claude-code CLI is installed")
        print("  3. Check internet connection")


if __name__ == "__main__":
    # 运行快速开始
    asyncio.run(quick_start())
