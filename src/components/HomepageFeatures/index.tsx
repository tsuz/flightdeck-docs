import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-Agent Framework',
    description: (
      <>
        Define agents with distinct roles, goals, and tools. Compose them
        into crews that collaborate to solve complex tasks autonomously.
      </>
    ),
  },
  {
    title: 'Any LLM, Any Provider',
    description: (
      <>
        Works with Claude, GPT, Gemini, Llama, Mistral, and any
        OpenAI-compatible API. Switch models per agent without changing your code.
      </>
    ),
  },
  {
    title: 'Built-in Tool Ecosystem',
    description: (
      <>
        Connect agents to web search, databases, APIs, file systems, and custom
        tools. Build your own tools with a simple decorator pattern.
      </>
    ),
  },
  {
    title: 'Workflow Control',
    description: (
      <>
        Sequential, parallel, and conditional execution modes. Route tasks
        dynamically based on agent outputs with built-in retry and fallback logic.
      </>
    ),
  },
  {
    title: 'Open Source & Extensible',
    description: (
      <>
        Apache 2.0 licensed. Extend with custom agents, tools, memory backends,
        and execution strategies. No vendor lock-in.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md" style={{padding: '1.5rem'}}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
