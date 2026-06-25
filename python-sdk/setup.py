from setuptools import setup, find_packages

setup(
    name="my-automaton-api",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
    ],
    python_requires=">=3.8",
    author="my-automaton",
    author_email="agent@automation.songheng.vip",
    description="Python client for my-automaton AI services — code review, analysis, security scanning, and more",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://automation.songheng.vip",
    project_urls={
        "API Docs": "https://automation.songheng.vip/api-docs.html",
        "Source": "https://github.com/chaosong/my-automaton-api",
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    keywords="ai, code-review, security-scan, text-analysis, summarization, api, developer-tools",
)
