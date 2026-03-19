---
sidebar_position: 2
---

# Multi-Agent Patterns

Common patterns for orchestrating multiple agents with Flightdeck.

## Pipeline Pattern

Agents work sequentially, each building on the previous output:

```python
from flightdeck import Agent, Crew, Task, Process

researcher = Agent(role="Researcher", goal="Gather data", model="claude-sonnet-4-6")
analyst = Agent(role="Analyst", goal="Analyze data", model="claude-sonnet-4-6")
writer = Agent(role="Writer", goal="Create reports", model="claude-sonnet-4-6")

research = Task(description="Research {topic}", agent=researcher)
analysis = Task(description="Analyze findings", agent=analyst, context=[research])
report = Task(description="Write final report", agent=writer, context=[analysis])

crew = Crew(
    agents=[researcher, analyst, writer],
    tasks=[research, analysis, report],
    process=Process.sequential,
)
```

## Fan-Out / Fan-In

Multiple agents work in parallel, then results are combined:

```python
# Fan-out: three researchers work in parallel
research_market = Task(
    description="Research market trends",
    agent=researcher_a,
    async_execution=True,
)
research_tech = Task(
    description="Research technology landscape",
    agent=researcher_b,
    async_execution=True,
)
research_competitors = Task(
    description="Research competitor activity",
    agent=researcher_c,
    async_execution=True,
)

# Fan-in: synthesize all research
synthesis = Task(
    description="Synthesize all research into a unified report",
    agent=writer,
    context=[research_market, research_tech, research_competitors],
)

crew = Crew(
    agents=[researcher_a, researcher_b, researcher_c, writer],
    tasks=[research_market, research_tech, research_competitors, synthesis],
)
```

## Reviewer Pattern

An agent reviews and improves another agent's output:

```python
coder = Agent(
    role="Software Engineer",
    goal="Write clean, correct code",
    model="claude-sonnet-4-6",
)
reviewer = Agent(
    role="Code Reviewer",
    goal="Find bugs and suggest improvements",
    model="claude-opus-4-6",  # Use a more capable model for review
)

write_code = Task(
    description="Write a Python function that {requirement}",
    agent=coder,
)
review_code = Task(
    description="Review the code for bugs, edge cases, and style issues. "
                "Provide the corrected version if changes are needed.",
    agent=reviewer,
    context=[write_code],
)

crew = Crew(
    agents=[coder, reviewer],
    tasks=[write_code, review_code],
)
```

## Hierarchical Delegation

A manager agent coordinates the team:

```python
crew = Crew(
    agents=[researcher, analyst, writer, designer],
    tasks=[
        Task(description="Create a comprehensive market report with visuals"),
    ],
    process=Process.hierarchical,
    manager_model="claude-opus-4-6",
)

# The manager will:
# 1. Break the task into subtasks
# 2. Assign subtasks to the most appropriate agents
# 3. Review outputs and request revisions
# 4. Combine everything into the final deliverable
```

## Router Pattern

Direct tasks to different agents based on input:

```python
from flightdeck import Agent, Router

support_router = Router(
    agents={
        "billing": Agent(role="Billing Specialist", goal="Handle billing issues", model="claude-sonnet-4-6"),
        "technical": Agent(role="Tech Support", goal="Resolve technical issues", model="claude-sonnet-4-6"),
        "general": Agent(role="General Support", goal="Handle general inquiries", model="claude-haiku-4-5"),
    },
    classifier_model="claude-haiku-4-5",  # Fast model for routing
)

result = support_router.route("I can't log into my account")
# Automatically routes to "technical" agent
```

## Iterative Refinement

Loop until quality criteria are met:

```python
from flightdeck import Agent, Crew, Task

writer = Agent(role="Writer", goal="Write high-quality content", model="claude-sonnet-4-6")
critic = Agent(role="Critic", goal="Evaluate and score content quality", model="claude-opus-4-6")

def quality_check(result) -> bool:
    """Return True if the output meets quality standards."""
    return "SCORE: 9" in result or "SCORE: 10" in result

crew = Crew(
    agents=[writer, critic],
    tasks=[
        Task(description="Write an article about {topic}", agent=writer),
        Task(
            description="Score the article 1-10. Format: SCORE: N. "
                        "If below 9, provide specific feedback for improvement.",
            agent=critic,
        ),
    ],
    iterate_until=quality_check,
    max_iterations=3,
)
```
