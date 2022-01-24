import pandas as pd
import numpy as np
import os
import re
import json
import sys

df = pd.DataFrame()

for dir_entry in os.scandir('out'):
    df = df.append(pd.read_csv(dir_entry.path), ignore_index=True)

df_saved = df
# %%

df = df_saved

# 3 = green correct, 2 = yellow wrong place, 1 = grey wrong letter, 0 = nothing

def extract_wordle(x):
    split = x.split()
    result = np.zeros((6, 5), dtype=int)
    
    if len(split) < 1 or len(split) > 6:
        return np.nan
    
    for i, letters in enumerate(split):
        letters = re.sub(r'[^🟩🟨⬜]', '', letters)
        
        if len(letters) != 5:
            return np.nan
        
        for j, letter in enumerate(letters):
            result[i][j] = 3 if letter == '🟩' else 2 if letter == '🟨' else 1
            
    return result
    
df = df.drop(['Unnamed: 0', 'withheld'], axis=1)
df['result'] = df['text'].str.replace(re.compile(r'[^⬛🟩🟨⬜\s]'), '').str.replace('⬛', '⬜').str.strip().apply(extract_wordle)
df['which'] = df['text'].str.lower().str.extract(r'(wordle \d+)', expand=False)
df = df[df['which'] == 'wordle 214']
df = df.dropna()

output = {}
output['by_letter'] = np.zeros((6, 5)).tolist()
output['by_row'] = np.zeros(6).tolist()
output['wins'] = np.zeros(7)
results = np.stack(df['result'].to_list(), 0)

for row in range(6):
    output['by_row'][row] = {'correct': 0, 'wrong_place': 0, 'wrong_letter': 0, 'all': 0}
    
    for col in range(5):
        included_letters, letter_counts = np.unique(results[:, row, col], return_counts=True)
        if 0 not in included_letters:
            letter_counts = np.insert(letter_counts, 0, 0)
                    
        output['by_letter'][row][col] = {
                                         'correct': letter_counts[3].sum(),
                                         'wrong_place': letter_counts[2].sum(),
                                         'wrong_letter': letter_counts[1].sum(),
                                         'all': letter_counts[3].sum() + letter_counts[2].sum() + letter_counts[1].sum()
                                         }
        output['by_row'][row]['correct'] += output['by_letter'][row][col]['correct']
        output['by_row'][row]['wrong_place'] += output['by_letter'][row][col]['wrong_place']
        output['by_row'][row]['wrong_letter'] += output['by_letter'][row][col]['wrong_letter']
        output['by_row'][row]['all'] += output['by_letter'][row][col]['all']
        
    output['wins'][row] = np.count_nonzero(np.all(results[:, row, :] == 3, axis=1))

output['wins'][6] = results[:, 0, 0].size - output['wins'].sum()
output['wins'] = output['wins'].tolist()

def convert(o):
    if isinstance(o, np.int64): return int(o)
    raise TypeError

json.dump(output, sys.stdout, default=convert)