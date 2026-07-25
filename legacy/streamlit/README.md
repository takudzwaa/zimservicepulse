# Legacy Streamlit prototype

This folder holds the original AI4I Streamlit dashboard (`v1-bootcamp` era).

The production app is the Next.js console at the repository root.

```bash
cd legacy/streamlit
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Point DATA at repo-root CSV, or symlink:
# ln -s ../../data data && ln -s ../../assets assets
streamlit run app.py
```

Note: `app.py` expects `data/` and `assets/` relative to its own directory.
Symlink them from the repo root if you need to re-run the prototype.
