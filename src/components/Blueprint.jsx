/* The wireframe frame every card and primary button wears in the Industry
   system: square corners, a hairline border, and a "+" registration mark at
   each corner. The system treats a framed element without the marks as wrong. */

export default function Blueprint({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`blueprint ${className}`.trim()} {...rest}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </Tag>
  );
}
