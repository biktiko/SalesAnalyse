import sys

with open('src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "{item.diffMonth > 0 ? '+' : ''}{filters.compareType === 'avg_day' ? formatNum(Math.round(item.diffMonth || 0)) : formatNum(Math.round(item.diffMonth || 0))}",
    "{item.diffMonth > 0 ? '+' : ''}{formatNum(Math.round(item.diffMonth || 0))}<span style={{ fontSize: '10px', marginLeft: '2px' }}>{activeModes.avg ? 'օր.' : 'հատ'}</span>"
)

text = text.replace(
    "{item.diffYear > 0 ? '+' : ''}{filters.compareType === 'avg_day' ? formatNum(Math.round(item.diffYear || 0)) : formatNum(Math.round(item.diffYear || 0))}",
    "{item.diffYear > 0 ? '+' : ''}{formatNum(Math.round(item.diffYear || 0))}<span style={{ fontSize: '10px', marginLeft: '2px' }}>{activeModes.avg ? 'օր.' : 'հատ'}</span>"
)

with open('src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Replaced')
