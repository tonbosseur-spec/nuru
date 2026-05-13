# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

extra_datas = collect_data_files('plotly') + collect_data_files('statsmodels') + collect_data_files('scipy') + collect_data_files('sklearn')

extra_hiddens = collect_submodules('plotly') + collect_submodules('statsmodels') + collect_submodules('scipy') + collect_submodules('sklearn')

a = Analysis(
    ['main_desktop.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('dist', 'dist'),
        ('backend', 'backend'),
    ] + extra_datas,
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'python-multipart',
        'multipart',
        'pandas',
        'openpyxl',
        'openpyxl.descriptors',
        'openpyxl.descriptors.serialisable',
        'openpyxl.cell',
        'openpyxl.workbook',
        'pandas._libs.tslibs.timedeltas',
        'pandas._libs.tslibs.np_datetime',
        'pandas._libs.tslibs.nattype',
        'pandas._libs.skiplist',
        'xlrd',
        'scipy.special.cython_special',
        'scipy.stats._stats',
        'sklearn.utils._cython_blas',
        'sklearn.utils._typedefs',
        'sklearn.neighbors._partition_nodes',
        'sklearn.neighbors._quad_tree',
        'sklearn.tree._utils',
    ] + extra_hiddens,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='NuruAnalytics',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon=['public/favicon.ico'], # Décommentez après avoir ajouté une icône
)
