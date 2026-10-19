import requests

def search_claudette():
    r = requests.get('https://api.github.com/search/repositories?q=claudette+dataset', headers={'User-Agent': 'Mozilla/5.0'})
    print("Claudette dataset search:")
    for item in r.json().get('items', [])[:10]:
        print(item['full_name'], "->", item['html_url'], "->", item.get('description'))

if __name__ == '__main__':
    search_claudette()
