import requests
import pandas as pd
import numpy as np
import time


headers = {'Authorization': 'Bearer ***REMOVED***'}


params = {
    'query': 'Wordle ("⬛" OR "🟩" OR "🟨" OR "⬜")',
    'max_results': 100,
    'tweet.fields': 'created_at',
    'next_token': 'b26v89c19zqg8o3fpe46dvwhhqcsea451aa7vldde8gvx'
}

while(num_tweets_collected < 100000):
    
    results = requests.get('https://api.twitter.com/2/tweets/search/recent', params=params, headers=headers)
    
    if results.status_code == 429: # rate limited, wait out
        print('rate limit exceeded')
        print(results.headers)
        time.sleep(int(results.headers['x-rate-limit-reset']) - time.time())
        
    
    else:
        json = results.json()
        num_tweets_collected += json['meta']['result_count']
        data = pd.DataFrame(json['data'])
        data.to_csv(f'out/{num_sheets}.csv')
        
        if 'next_token' not in json['meta']:
            print('No next token, breaking...')
            break
        
        num_sheets += 1
        params['next_token'] = json['meta']['next_token']
        print(f'Collected {num_tweets_collected} tweets, made {num_sheets} requests')
        time.sleep(1)