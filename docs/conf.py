# Sphinx configuration for FlowStudio Frontend documentation.
# https://www.sphinx-doc.org/

project = "FlowStudio Frontend"
copyright = "2026, Crestward Labs"
author = "Crestward Labs"
release = "1.0.0"
version = "1.0"

extensions = [
    "sphinx.ext.intersphinx",
    "sphinx.ext.todo",
]

exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_css_files = ["custom.css"]
html_baseurl = "https://flowstudio.crestwardlabs.com/frontend-documentation/"
html_show_sourcelink = True
html_title = "FlowStudio Frontend"

html_theme_options = {
    "navigation_depth": 4,
    "collapse_navigation": False,
    "sticky_navigation": True,
    "titles_only": False,
    "logo_only": False,
    "prev_next_buttons_location": "bottom",
    "style_external_links": False,
}

todo_include_todos = False

intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
}
