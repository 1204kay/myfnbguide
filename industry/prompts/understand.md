{{> content-understanding}}

{{> rules-domain}}

{{> rules-anti-hallucination}}

{{> rules-self-contained-title}}

{{> rules-lead}}

{{> rules-reader-copy}}

最终只返回一个 JSON 对象，按 itemType、authorRole、tags、titleZh、summaryZh、editorialJudgment 的顺序写这六个字段。导读规则只描述 summaryZh 的写法，不要增加其他字段。