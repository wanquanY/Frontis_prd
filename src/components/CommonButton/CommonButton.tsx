import classNames from "classnames";
import styles from "./CommonButton.module.less";

type ButtonVariant = "cancel" | "confirm" | "danger";

export interface CommonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant;
}

/**
 * 通用按钮（取消 / 确认 / 删除）
 */
export const CommonButton = ({ variant, className, ...rest }: CommonButtonProps): JSX.Element => {
  return (
    <button
      type="button"
      className={classNames(styles.btn, styles[variant], className)}
      {...rest}
    />
  );
};
