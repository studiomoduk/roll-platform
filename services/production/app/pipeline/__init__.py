"""The production pipeline (SPEC §2):

    1. retrieve graded pattern        → pattern.py
    2. apply length alteration        → alter.py
    3. add seam allowance             → seam.py
    4. create the lay (nesting)       → nest.py
    5. generate print layers          → print_layers.py
    6. export for the printer (TIFF)  → print_layers.render_lay
    7. work order (PDF)               → work_order.py

`run.py` orchestrates these and writes status to production_jobs.
"""
