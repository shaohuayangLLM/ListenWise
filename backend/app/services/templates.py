"""Scene-specific prompt templates and mock data for document generation."""

SCENE_TEMPLATES: dict[str, dict] = {
    "requirement_review": {
        "name": "需求评审会",
        "system_prompt": (
            "你是一位资深的产品经理助理。请根据以下会议转录内容，整理一份结构化的需求评审会纪要。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 会议整体摘要（一段话）\n'
            '- "requirements": 需求清单列表，每项包含 {"id", "title", "description", "priority", "status"}\n'
            '- "discussion_points": 讨论要点列表，每项包含 {"topic", "opinions", "conclusion"}\n'
            '- "decisions": 最终决策列表\n'
            '- "action_items": 待办事项列表，每项包含 {"task", "assignee", "deadline"}\n'
        ),
        "mock_data": {
            "summary": "本次需求评审会围绕 v2.0 版本的核心功能进行讨论，重点评审了用户中心改版、消息推送优化和数据报表三个需求模块。",
            "requirements": [
                {
                    "id": "REQ-001",
                    "title": "用户中心改版",
                    "description": "重新设计用户中心页面，增加个人数据面板、使用统计和偏好设置入口。",
                    "priority": "P0",
                    "status": "已通过",
                },
                {
                    "id": "REQ-002",
                    "title": "消息推送优化",
                    "description": "支持按用户行为标签进行精准推送，新增静默推送和摘要推送模式。",
                    "priority": "P1",
                    "status": "待修改",
                },
                {
                    "id": "REQ-003",
                    "title": "数据报表模块",
                    "description": "提供可视化数据看板，支持自定义时间范围和多维度筛选。",
                    "priority": "P1",
                    "status": "已通过",
                },
            ],
            "discussion_points": [
                {
                    "topic": "用户中心信息架构",
                    "opinions": [
                        "产品建议采用卡片式布局，设计团队认为 Tab 式更清晰",
                        "技术侧提出需考虑组件复用和性能",
                    ],
                    "conclusion": "采用卡片式布局方案，首屏展示核心数据",
                },
                {
                    "topic": "推送频率控制",
                    "opinions": [
                        "运营希望不限制推送频次",
                        "产品建议每日上限 3 条",
                    ],
                    "conclusion": "默认每日 3 条，VIP 用户可调整上限至 5 条",
                },
            ],
            "decisions": [
                "用户中心改版进入开发阶段，目标 3 月 15 日上线",
                "消息推送需补充频率控制的产品方案后再次评审",
                "数据报表本迭代完成基础版，高级筛选延后",
            ],
            "action_items": [
                {
                    "task": "输出用户中心 UI 设计稿",
                    "assignee": "设计-小王",
                    "deadline": "本周五",
                },
                {
                    "task": "补充推送频率控制方案",
                    "assignee": "产品-小李",
                    "deadline": "下周一",
                },
                {
                    "task": "确认报表数据源接口",
                    "assignee": "后端-小张",
                    "deadline": "本周三",
                },
            ],
        },
    },
    "report_meeting": {
        "name": "汇报会议",
        "system_prompt": (
            "你是一位专业的会议记录助理。请根据以下汇报会议转录内容，整理一份结构化的会议纪要。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 汇报摘要（一段话）\n'
            '- "key_data": 汇报中提到的关键数据和指标列表，每项包含 {"metric", "value", "trend"}\n'
            '- "qa_records": 问答记录列表，每项包含 {"question", "questioner", "answer"}\n'
            '- "follow_up_actions": 后续行动计划列表，每项包含 {"action", "owner", "deadline"}\n'
        ),
        "mock_data": {
            "summary": "本次汇报会议由技术团队汇报 Q4 技术架构升级进展，涵盖微服务拆分、性能优化和稳定性建设三个方面的工作成果。",
            "key_data": [
                {"metric": "系统可用性", "value": "99.95%", "trend": "较上季度提升 0.03%"},
                {"metric": "API 平均响应时间", "value": "45ms", "trend": "较上季度降低 30%"},
                {"metric": "微服务拆分进度", "value": "75%", "trend": "按计划推进"},
                {"metric": "线上故障数", "value": "2 次", "trend": "较上季度减少 60%"},
            ],
            "qa_records": [
                {
                    "question": "微服务拆分对现有业务的影响如何评估？",
                    "questioner": "CTO",
                    "answer": "我们采用了灰度发布策略，每个服务拆分后先在 10% 流量上验证，确保无问题后才全量切换。",
                },
                {
                    "question": "性能优化的投入产出比怎么样？",
                    "questioner": "VP",
                    "answer": "本季度投入 2 人月，但带来了 30% 的响应时间改善和 20% 的服务器成本节约。",
                },
            ],
            "follow_up_actions": [
                {"action": "完成剩余 25% 微服务拆分", "owner": "架构组", "deadline": "Q1 结束前"},
                {"action": "输出性能优化最佳实践文档", "owner": "基础架构", "deadline": "下月中旬"},
                {"action": "制定下季度稳定性建设 OKR", "owner": "SRE 团队", "deadline": "本月底"},
            ],
        },
    },
    "leadership_conference": {
        "name": "领导大会",
        "system_prompt": (
            "你是一位资深的秘书。请根据以下领导讲话转录内容，整理一份结构化的讲话纪要。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 讲话整体概述（一段话）\n'
            '- "key_points": 核心讲话要点列表，每项包含 {"topic", "content"}\n'
            '- "policy_directions": 政策方向和战略部署列表\n'
            '- "notable_quotes": 金句摘录列表\n'
        ),
        "mock_data": {
            "summary": "本次大会围绕年度战略部署展开，强调数字化转型、人才建设和创新驱动三大战略方向，为下一阶段工作指明了方向。",
            "key_points": [
                {
                    "topic": "数字化转型",
                    "content": "全面推进数字化转型，将数字化能力建设作为核心竞争力。加大对 AI、大数据等技术的投入，推动业务流程智能化。",
                },
                {
                    "topic": "人才战略",
                    "content": "实施「精英人才计划」，加强内部培养与外部引进并重。优化薪酬体系，建立更具竞争力的人才激励机制。",
                },
                {
                    "topic": "创新驱动",
                    "content": "鼓励基层创新，设立创新基金和孵化机制。每个事业部需设立创新实验室，季度汇报创新成果。",
                },
            ],
            "policy_directions": [
                "加快推进组织架构扁平化改革",
                "建立跨部门协作的常态化机制",
                "加大对研发的资金投入，研发费用占比提升至 15%",
                "推动国际化战略，重点布局东南亚市场",
            ],
            "notable_quotes": [
                "数字化不是选择题，而是必答题。不转型就淘汰。",
                "人才是最大的竞争力，我们要让优秀的人有舞台、有回报。",
                "创新要容许失败，但不容许不创新。",
            ],
        },
    },
    "parent_meeting": {
        "name": "家长会",
        "system_prompt": (
            "你是一位贴心的教育助理。请根据以下家长会转录内容，整理一份结构化的家长会纪要。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 家长会整体概述（一段话）\n'
            '- "teacher_feedback": 老师反馈列表，每项包含 {"subject", "teacher", "content", "suggestions"}\n'
            '- "study_suggestions": 学习建议列表，每项包含 {"area", "suggestion"}\n'
            '- "parent_todos": 家长待办事项列表\n'
        ),
        "mock_data": {
            "summary": "本次家长会由班主任和各科老师分别汇报了本学期学生的整体表现，重点讨论了期中考试情况、学习习惯培养和家校配合事项。",
            "teacher_feedback": [
                {
                    "subject": "语文",
                    "teacher": "王老师",
                    "content": "整体阅读能力有提升，但作文表达需加强。本次期中考试班级平均分 85 分，较上学期提高 3 分。",
                    "suggestions": "每天坚持阅读 30 分钟，每周写一篇随笔练习",
                },
                {
                    "subject": "数学",
                    "teacher": "李老师",
                    "content": "基础计算能力良好，但应用题分析能力偏弱。需要加强逻辑思维训练。",
                    "suggestions": "注重审题训练，多做思维拓展类题目",
                },
                {
                    "subject": "英语",
                    "teacher": "张老师",
                    "content": "听说能力进步明显，词汇量需要持续积累。部分同学语法基础还需巩固。",
                    "suggestions": "每天听英语音频 15 分钟，坚持背单词",
                },
            ],
            "study_suggestions": [
                {"area": "时间管理", "suggestion": "制定每日学习计划表，合理分配各科学习时间"},
                {"area": "作业习惯", "suggestion": "先复习后作业，培养独立思考能力，不依赖电子设备查答案"},
                {"area": "课外阅读", "suggestion": "每月至少阅读 2 本课外书，建立阅读笔记本"},
            ],
            "parent_todos": [
                "签署期中考试成绩单并于本周五前交回",
                "关注孩子每日作业完成情况，签字确认",
                "下载「班级通」APP 查看每周学习报告",
                "下月参加亲子阅读活动（具体时间另行通知）",
            ],
        },
    },
    "phone_call": {
        "name": "电话录音",
        "system_prompt": (
            "你是一位专业的通话记录助理。请根据以下电话录音转录内容，整理一份结构化的通话纪要。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 通话摘要（一段话）\n'
            '- "key_info": 关键信息列表，每项包含 {"label", "value"}\n'
            '- "commitments": 承诺事项列表，每项包含 {"party", "commitment", "deadline"}\n'
            '- "next_steps": 后续跟进事项列表\n'
        ),
        "mock_data": {
            "summary": "本次通话为与供应商关于 Q2 采购合同续约的商务沟通，双方就价格调整、交付周期和售后服务条款进行了协商。",
            "key_info": [
                {"label": "通话对象", "value": "XX 科技有限公司 销售经理 陈先生"},
                {"label": "通话主题", "value": "Q2 采购合同续约谈判"},
                {"label": "合同金额", "value": "年框 120 万，较去年上浮 5%"},
                {"label": "交付周期", "value": "下单后 15 个工作日内交付"},
            ],
            "commitments": [
                {
                    "party": "供应商",
                    "commitment": "提供最终报价单和合同草案",
                    "deadline": "本周三前",
                },
                {
                    "party": "我方",
                    "commitment": "内部审批采购预算",
                    "deadline": "下周一前",
                },
                {
                    "party": "供应商",
                    "commitment": "安排技术团队对接售后服务方案",
                    "deadline": "签约后一周内",
                },
            ],
            "next_steps": [
                "等待供应商发送正式报价单",
                "内部走采购审批流程",
                "安排法务审核合同条款",
                "确认签约日期（暂定下周四）",
            ],
        },
    },
    "study_recording": {
        "name": "学习录音",
        "system_prompt": (
            "你是一位专业的学习助手。请根据以下学习录音转录内容，整理一份结构化的学习笔记。"
            "请严格以 JSON 格式输出，包含以下字段：\n"
            '- "summary": 内容概述（一段话）\n'
            '- "outline": 知识点大纲列表，每项包含 {"chapter", "topics"}\n'
            '- "key_notes": 重点笔记列表，每项包含 {"point", "detail", "importance"}\n'
            '- "concepts": 概念解释列表，每项包含 {"term", "definition", "example"}\n'
        ),
        "mock_data": {
            "summary": "本次课程讲解了分布式系统中的一致性问题，涵盖 CAP 定理、Raft 共识算法和分布式事务的核心概念与实践应用。",
            "outline": [
                {
                    "chapter": "CAP 定理",
                    "topics": [
                        "一致性（Consistency）",
                        "可用性（Availability）",
                        "分区容错性（Partition Tolerance）",
                        "CAP 的权衡与实际应用",
                    ],
                },
                {
                    "chapter": "Raft 共识算法",
                    "topics": [
                        "Leader 选举机制",
                        "日志复制流程",
                        "安全性保证",
                        "与 Paxos 的对比",
                    ],
                },
                {
                    "chapter": "分布式事务",
                    "topics": [
                        "2PC 两阶段提交",
                        "3PC 三阶段提交",
                        "Saga 模式",
                        "TCC 补偿事务",
                    ],
                },
            ],
            "key_notes": [
                {
                    "point": "CAP 不可能三角",
                    "detail": "在分布式系统中，一致性、可用性和分区容错性三者最多只能同时满足两个。实际系统中分区容错性是必须的，所以通常在 C 和 A 之间做权衡。",
                    "importance": "高",
                },
                {
                    "point": "Raft 的核心优势",
                    "detail": "相比 Paxos，Raft 将共识问题分解为 Leader 选举、日志复制和安全性三个子问题，更容易理解和实现。",
                    "importance": "高",
                },
                {
                    "point": "Saga 模式适用场景",
                    "detail": "适用于长事务场景，每个步骤都有对应的补偿操作。适合微服务架构下的跨服务事务管理。",
                    "importance": "中",
                },
            ],
            "concepts": [
                {
                    "term": "最终一致性",
                    "definition": "系统保证在没有新的更新操作的情况下，最终所有副本的数据都会达到一致状态。",
                    "example": "DNS 系统就是典型的最终一致性系统，域名更新后需要一段时间才能在全球生效。",
                },
                {
                    "term": "脑裂（Split Brain）",
                    "definition": "在分布式系统中，由于网络分区导致多个节点同时认为自己是 Leader 的情况。",
                    "example": "主从数据库集群在网络故障时可能出现两个主节点同时写入数据的问题。",
                },
                {
                    "term": "幂等性",
                    "definition": "同一操作执行多次与执行一次的效果相同，是分布式系统中处理重试的关键设计原则。",
                    "example": "支付接口需要设计为幂等的，避免用户因网络超时重试导致重复扣款。",
                },
            ],
        },
    },
}


def get_template(scene_type: str) -> dict:
    """Get the template for a given scene type."""
    return SCENE_TEMPLATES.get(scene_type, SCENE_TEMPLATES["report_meeting"])


def get_mock_document(scene_type: str) -> dict:
    """Get mock document data for a given scene type."""
    template = get_template(scene_type)
    return template["mock_data"]


def get_system_prompt(scene_type: str) -> str:
    """Get the system prompt for a given scene type."""
    template = get_template(scene_type)
    return template["system_prompt"]
