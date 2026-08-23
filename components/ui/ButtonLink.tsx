import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes } from 'react';
import { buttonClasses, ButtonVariant } from './Button';

type Props = LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant };

export function ButtonLink({ variant = 'primary', className = '', ...props }: Props) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
