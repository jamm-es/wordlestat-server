# Requires 1 argument: start_id, which is the previous most recent tweet.
# This is needed because using both start_time and end_time is broken.

import requests
import pandas as pd
import numpy as np
import time
import os
import re
import json
import sys

with open('./twitter.key') as f:
    bearer_token = str(f.read()).strip()

headers = {'Authorization': f'Bearer {bearer_token}'}

params = {
    'query': 'Wordle ("⬛" OR "🟩" OR "🟨" OR "⬜")',
    'max_results': 25,
    'tweet.fields': 'created_at',
}
if sys.argv[1] == 'time':
    params['start_time'] = sys.argv[2]
elif sys.argv[1] == 'id':
    params['since_id'] = sys.argv[2]
else:
    raise Exception('Invalid start specifier')
    
sys.stderr.write(f'Running with specifier {sys.argv[1]} and param {sys.argv[2]}')

num_tweets_collected = 0

df = pd.DataFrame()

newest_id = 0

while(num_tweets_collected < 150):
    
    response = requests.get('https://api.twitter.com/2/tweets/search/recent', params=params, headers=headers)

    if response.status_code == 429: # rate limited, wait out
        sys.stderr.write('rate limit exceeded\n')
        sys.stderr.write(response.headers)
        time.sleep(int(response.headers['x-rate-limit-reset']) - time.time())
    
    elif response.status_code != 200:
        sys.stderr.write('Errored\n')
        sys.stderr.write(response.text)
        raise Exception
    
    else:
        results_json = response.json()
        
        if results_json['meta']['result_count'] == 0:
            sys.stderr.write('No tweets collected, breaking...\n')
            break
        
        num_tweets_collected += results_json['meta']['result_count']
        sys.stderr.write(f'Collected {num_tweets_collected} tweets')
        df = df.append(results_json['data'])
        
        if newest_id < int(results_json['meta']['newest_id']):
            newest_id = int(results_json['meta']['newest_id'])
        
        if 'next_token' not in results_json['meta']:
            sys.stderr.write('No next token, breaking...')
            break
        
        params['next_token'] = results_json['meta']['next_token']
        time.sleep(1)
        
if len(df.index) == 0:
    sys.stderr.write('No tweets collected, exiting.\n')
    sys.exit(1)
        
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
    
df['result'] = df['text'].str.replace(re.compile(r'[^⬛🟩🟨⬜\s]'), '').str.replace('⬛', '⬜').str.strip().apply(extract_wordle)
df['which'] = df['text'].str.lower().str.extract(r'(wordle \d+)', expand=False)
df = df.dropna()

which_wordles = df['which'].value_counts().head(2).index

all_wordle_output = {}

for wordle_name in which_wordles:

    output = {}
    output['byLetter'] = np.zeros((6, 5)).tolist()
    output['byRow'] = np.zeros(6).tolist()
    output['wins'] = np.zeros(7)
    results = np.stack(df[df['which'] == wordle_name]['result'].to_list(), 0)
    
    for row in range(6):
        output['byRow'][row] = {'correct': 0, 'wrongPlace': 0, 'wrongLetter': 0, 'total': 0}
        
        for col in range(5):
            letter_counts = {0: 0, 1: 0, 2: 0, 3: 0}
            included_letters, raw_letter_counts = np.unique(results[:, row, col], return_counts=True)
            for included_letter, letter_count in zip(included_letters, raw_letter_counts):
                letter_counts[included_letter] = letter_count
                        
            output['byLetter'][row][col] = {
                                             'correct': letter_counts[3],
                                             'wrongPlace': letter_counts[2],
                                             'wrongLetter': letter_counts[1],
                                             'total': letter_counts[3] + letter_counts[2] + letter_counts[1]
                                             }
            output['byRow'][row]['correct'] += output['byLetter'][row][col]['correct']
            output['byRow'][row]['wrongPlace'] += output['byLetter'][row][col]['wrongPlace']
            output['byRow'][row]['wrongLetter'] += output['byLetter'][row][col]['wrongLetter']
            output['byRow'][row]['total'] += output['byLetter'][row][col]['total']
            
        output['wins'][row] = np.count_nonzero(np.all(results[:, row, :] == 3, axis=1))
    
    output['wins'][6] = results[:, 0, 0].size - output['wins'].sum()
    output['wins'] = output['wins'].tolist()
    output['total'] = len(results)
        
    all_wordle_output[wordle_name] = output
    
    sys.stderr.write(f'Finished processing {wordle_name}\n')

def convert(o):
    if isinstance(o, np.int64): return int(o)
    raise TypeError

json.dump({'data': all_wordle_output, 'newestId': str(newest_id)}, sys.stdout, default=convert)