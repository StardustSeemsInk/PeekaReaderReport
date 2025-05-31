#!/usr/bin/env python3
"""
Python环境设置脚本
用于为ReaderReport应用准备Python运行环境
"""

import subprocess
import sys
import os
import shutil
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误: 需要Python 3.8或更高版本")
        print(f"当前版本: {sys.version}")
        return False
    print(f"✓ Python版本: {sys.version}")
    return True

def install_requirements():
    """安装Python依赖"""
    requirements_path = Path("src-tauri/python/requirements.txt")
    if not requirements_path.exists():
        print(f"❌ requirements.txt文件不存在: {requirements_path}")
        return False
    
    print("正在安装Python依赖...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_path)
        ])
        print("✓ Python依赖安装完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 依赖安装失败: {e}")
        return False

def verify_imports():
    """验证关键模块可以正常导入"""
    modules = {
        'pandas': 'pandas>=1.5.0',
        'matplotlib': 'matplotlib>=3.6.0', 
        'numpy': 'numpy>=1.24.0',
        'docx': 'python-docx>=0.8.11',
        'openpyxl': 'openpyxl>=3.0.10'
    }
    
    print("\n验证模块导入...")
    all_ok = True
    
    for module, requirement in modules.items():
        try:
            __import__(module)
            print(f"✓ {module} - 可用")
        except ImportError:
            print(f"❌ {module} - 不可用 (需要: {requirement})")
            all_ok = False
    
    return all_ok

def check_matplotlib_backend():
    """检查matplotlib后端配置"""
    try:
        import matplotlib
        matplotlib.use('Agg')  # 设置为非GUI后端
        import matplotlib.pyplot as plt
        print("✓ matplotlib后端配置正确")
        return True
    except Exception as e:
        print(f"❌ matplotlib配置错误: {e}")
        return False

def main():
    """主函数"""
    print("🐍 ReaderReport Python环境设置")
    print("=" * 50)
    
    # 检查Python版本
    if not check_python_version():
        return False
    
    # 安装依赖
    if not install_requirements():
        return False
    
    # 验证导入
    if not verify_imports():
        print("\n❌ 部分模块导入失败，请检查安装")
        return False
    
    # 检查matplotlib
    if not check_matplotlib_backend():
        return False
    
    print("\n🎉 Python环境设置完成！")
    print("现在可以运行以下命令构建应用:")
    print("  yarn tauri build")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)