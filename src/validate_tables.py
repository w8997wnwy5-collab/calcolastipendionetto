import json
T = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'tables_2026.json')))
BR = [1] + [3001 + 600*k for k in range(413)]
fam = {'A': ['A0'], 'B': [f'B{i}' for i in range(5)], 'C': [f'C{i}' for i in range(5)], 'H': [f'H{i}' for i in range(1,5)]}
front = {'A': ['R0'], 'B': [f'S{i}' for i in range(5)], 'C': [f'T{i}' for i in range(5)], 'H': [f'U{i}' for i in range(1,5)]}
problems = 0
# 1) children monotonic: more children -> rate <= fewer children
for grp in list(fam.values()) + list(front.values()):
    for a, b in zip(grp, grp[1:]):
        bad = [(BR[i], T[a][i], T[b][i]) for i in range(414) if T[b][i] > T[a][i]]
        if bad: problems += len(bad); print('CHILD-ORDER', a, b, bad[:6])
# 2) after the minimum, rates should be non-decreasing; and step jumps small
for name, col in T.items():
    imin = min(range(414), key=lambda i: (col[i], i))
    # last index of the minimum plateau
    j = imin
    while j + 1 < 414 and col[j+1] == col[imin]: j += 1
    dec = [(BR[i], col[i-1], col[i]) for i in range(j+1, 414) if col[i] < col[i-1]]
    big = [(BR[i], col[i-1], col[i]) for i in range(1, 414) if BR[i] > 60001 and col[i] - col[i-1] > 2]
    if dec: problems += len(dec); print('DECREASE', name, dec[:8])
    if big: problems += len(big); print('BIGSTEP', name, big[:8])
# 3) frontalieri = floor(0.8 * base) at 0.1 granularity (values in tenths)
for L in 'ABCH':
    for base, fr in zip(fam[L], front[L]):
        mism = [(BR[i], T[base][i], T[fr][i], (8 * T[base][i]) // 10) for i in range(414) if (8 * T[base][i]) // 10 != T[fr][i]]
        if mism: problems += len(mism); print('RULE', base, '->', fr, len(mism), 'mismatches:', [(b, f'{x/10:.1f}', f'{y/10:.1f}', f'exp {z/10:.1f}') for b, x, y, z in mism[:12]])
print('problems:', problems)
