import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}
            to="/docs/quickstart">
            Quickstart (5 min)
          </Link>
        </div>
      </div>
    </header>
  );
}

function CodeExample() {
  return (
    <section style={{padding: '3rem 0', background: 'var(--ifm-background-surface-color)'}}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h2">Define agents in minutes</Heading>
            <p>
              Flightdeck lets you define AI agents, compose them into workflows,
              and orchestrate multi-agent systems with a simple Python API.
              Connect any LLM provider, add tools, and let your agents collaborate.
            </p>
            <Link className="button button--primary" to="/docs/quickstart">
              See the full quickstart
            </Link>
          </div>
          <div className="col col--6">
            <pre style={{
              background: 'var(--ifm-code-background)',
              padding: '1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              overflow: 'auto',
            }}>
              <code>{`from flightdeck import Agent, Crew, Task

researcher = Agent(
    role="Researcher",
    goal="Find accurate information",
    model="claude-sonnet-4-6",
    tools=[web_search, file_reader],
)

writer = Agent(
    role="Writer",
    goal="Create clear documentation",
    model="claude-sonnet-4-6",
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[
        Task("Research the topic", agent=researcher),
        Task("Write a summary", agent=writer),
    ],
)

result = crew.run()`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="AI Agent Framework"
      description="Flightdeck is an open-source AI agent framework layer for building, composing, and managing multi-agent systems.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <CodeExample />
      </main>
    </Layout>
  );
}
