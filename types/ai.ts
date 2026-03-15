export interface QuantIdea {
  title: string;
  hypothesis: string;
  dataset: string;
  methodology: string;
  eval_metric: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface MicroTask {
  task_description: string;
  resource_link: string;
  hands_on_exercise: string;
}
