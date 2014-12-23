function htmlDecode(str) {
    return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<br>/g, "\n")
        .replace(/<br\/>/g, '')
        .replace(/&nbsp;/g, ' ');
};

function imgEncode(str) {
     return String(str)
        .replace(/(&lt;img.*?&quot;&gt;)/g, function(s) {
            return String(s)
                .replace(/&lt;/g, '<')
                .replace(/&quot;/g, '"')
                .replace(/&gt;/g, '>')
        });
};