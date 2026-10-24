import React, { useEffect, useState } from 'react';
import { needsResolve, resolveAttachment } from '../services/attachments';

/**
 * Drop-in replacement for <img> that understands private Google Drive attachment URLs.
 * Data URLs and ordinary URLs are shown as-is; Drive URLs are downloaded (and cached) through
 * the authenticated backend.
 */
export const AttachmentImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, className, alt, ...rest }) => {
  const direct = !!src && !needsResolve(src);
  const [resolved, setResolved] = useState<string>(direct ? String(src) : '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!src) { setResolved(''); return; }
    if (!needsResolve(src)) { setResolved(String(src)); return; }
    setResolved('');
    resolveAttachment(String(src))
      .then((u) => { if (alive) { setResolved(u); if (!u) setFailed(true); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [src]);

  if (!resolved) {
    return (
      <span
        className={`${className || ''} inline-flex items-center justify-center bg-gray-100 text-[10px] text-gray-400 ${failed ? '' : 'animate-pulse'}`}
        title={failed ? 'تصویر بارگیری نشد' : 'در حال بارگیری تصویر…'}
      >
        {failed ? '⚠' : ''}
      </span>
    );
  }
  return <img {...rest} src={resolved} alt={alt} className={className} />;
};
