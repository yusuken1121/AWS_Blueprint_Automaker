/**
 * Well-Architected Framework の定義とユーティリティ
 */

import type { WellArchitectedPillar } from './types';

/**
 * Well-Architected Framework の6つの柱の日本語名マッピング
 */
export const WELL_ARCHITECTED_PILLAR_NAMES: Record<WellArchitectedPillar, string> = {
  'cost-optimization': 'コスト最適化',
  'performance-efficiency': 'パフォーマンス効率',
  'reliability': '信頼性',
  'security': 'セキュリティ',
  'operational-excellence': '運用の優秀性',
  'sustainability': '持続可能性',
};

/**
 * Well-Architected Framework の説明
 */
export const WELL_ARCHITECTED_PILLAR_DESCRIPTIONS: Record<WellArchitectedPillar, string> = {
  'cost-optimization': 'システムを実行するコストを削減し、ビジネス価値を最大化する',
  'performance-efficiency': 'コンピューティングリソースを効率的に使用して要件を満たす',
  'reliability': 'システムが期待通りに動作し、障害から回復する能力',
  'security': '情報、システム、資産を保護し、ビジネス価値をリスクから守る',
  'operational-excellence': '運用プロセスと手順を実行・改善する能力',
  'sustainability': '環境への影響を最小限に抑えながら、長期的なビジネス価値を実現する',
};

