# 把正文（phase1-prose.md）、表（work/report-tables.md）和关键词表拼成 podcasts-phase1.md。
# 用法：python -I -X utf8 06_build_md.py <work 目录> <输出目录>
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
work, out_dir = sys.argv[1], sys.argv[2]
rd = lambda p: open(p, encoding='utf-8').read()
kw = rd(os.path.join(here, 'keywords.py'))
i, j = kw.index('VENUE_EN = '), kw.index('_STRONG = [')
parts = [rd(os.path.join(here, 'phase1-prose.md')).rstrip(), '',
         '---', '', '# 附录 A：表', '', '这些表由 `scripts/05_report_tables.py` 从 `work/` 里的结果生成。', '',
         rd(os.path.join(work, 'report-tables.md')).rstrip(), '',
         '---', '', '# 附录 B：关键词表全文（第 3 轮，定稿）', '',
         '正则写在清洗以后的文字上（小写、去重音）。`VENUE_EN` 是英语里店的种类；`STRONG` 每行是（语言标记，正则，需要的上下文）；'
         '`WEAK` 每行是（标记，窗口，店或行业的词，经营的词，限定的语言）；`WEAK_SINGLE` 是单独成立的弱信号。'
         '第 1、2 轮的版本在 `scripts/rounds/`。', '',
         '## B.1 强信号和弱信号（`scripts/keywords.py`）', '', '```python', kw[i:j].rstrip(), '```', '',
         '## B.2 进中间文件的宽口径词根（`scripts/anchor.py`）', '', '```python',
         rd(os.path.join(here, 'anchor.py')).rstrip(), '```', '']
open(os.path.join(out_dir, 'podcasts-phase1.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(parts))
print('written', os.path.join(out_dir, 'podcasts-phase1.md'))
