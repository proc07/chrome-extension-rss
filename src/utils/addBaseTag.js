export default function addBaseTag(htmlCode, baseUrl) {
  // // 1. 创建DOM解析器
  // const parser = new DOMParser();
  // const doc = parser.parseFromString(htmlCode, 'text/html');
  
  // // 2. 确保head存在（自动修复不完整的HTML结构）
  // if (!doc.head) {
  //   const head = doc.createElement('head');
  //   doc.documentElement.insertBefore(head, doc.body || doc.documentElement.firstChild);
  // }

  // // 3. 移除已存在的base标签（避免冲突）
  // const existingBase = doc.querySelector('base');
  // if (existingBase) existingBase.remove();

  // // 4. 创建并插入新的base标签
  // const baseTag = doc.createElement('base');
  // baseTag.href = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  // doc.head.prepend(baseTag);
  // console.log(baseTag, doc)

  // let finalHtml = doc.documentElement.outerHTML;
  // return finalHtml;

  const modifiedHtml = htmlCode.replace(
    /<head(.*?)>/i, 
    `<head$1><base href="${baseUrl}" />`
  );

  return modifiedHtml
}

export function getTitleFromHtmlRegex(htmlString) {
  const match = htmlString.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}