import {
  NamedPage, Notification, addPage, download, i18n, request,
} from '@hydrooj/ui-default';

addPage(new NamedPage('problem_detail', () => {
  const btn = document.querySelector<HTMLAnchorElement>('[name="originlink__download-origin"]');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const domainId = btn.dataset.domain;
    const pid = btn.dataset.pid;
    const title = btn.dataset.title || pid;

    Notification.info(i18n('Downloading...'));
    try {
      // 从原题所在域获取题目信息（JSON 格式）
      const resp = await fetch(`/d/${domainId}/p/${pid}`, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const body = await resp.json();
      const pdoc = body.pdoc;
      const zipName = (pdoc.title || title).replace(/\./g, ' ');

      const targets: { filename: string; url?: string; content?: string }[] = [];

      // 题目内容
      try {
        const c = JSON.parse(pdoc.content);
        if (Array.isArray(c) || typeof c === 'string') throw new Error('not object');
        for (const key of Object.keys(c)) {
          targets.push({
            filename: `${pid}/problem_${key}.md`,
            content: typeof c[key] === 'string' ? c[key] : JSON.stringify(c[key]),
          });
        }
      } catch {
        targets.push({ filename: `${pid}/problem.md`, content: pdoc.content });
      }

      // 获取测试数据下载链接
      const testdata: string[] = (pdoc.data || []).map((f: any) => f.name);
      if (testdata.length) {
        const { links: tdLinks } = await request.post(
          `/d/${domainId}/p/${pid}/files`,
          { operation: 'get_links', files: testdata, type: 'testdata' },
        );
        for (const filename of Object.keys(tdLinks)) {
          targets.push({ filename: `${pid}/testdata/${filename}`, url: tdLinks[filename] });
        }
      }

      // 获取附加文件下载链接
      const additionalFiles: string[] = (pdoc.additional_file || []).map((f: any) => f.name);
      if (additionalFiles.length) {
        const { links: aflLinks } = await request.post(
          `/d/${domainId}/p/${pid}/files`,
          { operation: 'get_links', files: additionalFiles, type: 'additional_file' },
        );
        for (const filename of Object.keys(aflLinks)) {
          targets.push({ filename: `${pid}/additional_file/${filename}`, url: aflLinks[filename] });
        }
      }

      await download(`${zipName}.zip`, targets);
    } catch (err: any) {
      window.captureException?.(err);
      Notification.error(err.message || String(err));
    }
  });
}));
