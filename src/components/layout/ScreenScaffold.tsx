import { Card } from '@/components/ui';

import styles from './ScreenScaffold.module.css';

export interface ScreenScaffoldProps {
  title: string;
  description: string;
  /** legacy/ 안의 원본 프로토타입 파일 경로 — 포팅할 때 이 파일을 보고 옮긴다. */
  legacySource: string;
  /** 이 화면을 맡은 팀원. docs/TEAM.md 와 같은 값을 쓴다. */
  owner: string;
  /** 이 화면에서 해야 할 일 목록. 완료되면 항목을 지우고, 다 비면 이 컴포넌트를 제거한다. */
  todos: string[];
  children?: React.ReactNode;
}

/**
 * 아직 포팅이 끝나지 않은 화면의 껍데기.
 * 담당자가 실제 UI를 완성하면 이 컴포넌트를 통째로 걷어내면 된다.
 */
export function ScreenScaffold({
  title,
  description,
  legacySource,
  owner,
  todos,
  children,
}: ScreenScaffoldProps) {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </header>

      {children}

      <Card className={styles.notice}>
        <p className={styles.noticeLabel}>작업 중인 화면</p>
        <dl className={styles.meta}>
          <dt>담당</dt>
          <dd>{owner}</dd>
          <dt>원본</dt>
          <dd>
            <code>{legacySource}</code>
          </dd>
        </dl>
        <ul className={styles.todos}>
          {todos.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
