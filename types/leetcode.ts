export interface LeetCodeTopicTag {
  name: string;
}

export interface LeetCodeQuestion {
  title: string;
  difficulty: string;
  acRate: number;
  topicTags: LeetCodeTopicTag[];
}

export interface DailyChallenge {
  date: string;
  link: string;
  question: LeetCodeQuestion;
}

export interface DailyChalllengeResponse {
  data: {
    activeDailyCodingChallengeQuestion: DailyChallenge;
  };
}
