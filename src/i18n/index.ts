/**
 * 国际化支持
 */

export type Language = 'zh' | 'en';

export interface I18nMessages {
  // 应用基础
  appName: string;
  
  // 状态名称
  states: {
    idle: string;
    focus: string;
    reflection: string;
    rest: string;
  };
  
  // 控制面板
  controlPanel: {
    title: string;
    startFocus: string;
    startReflection: string;
    startRest: string;
    cancel: string;
    reflectionSummary: string;
    currentStatus: string;
    focusLocked: string;
    focusLockedInfo: string;
    alreadyFocusing: string;
    timeReached: string;
    actionFailed: string;
    cannotStartFocus: string;
    needMinFocusTime: string;
    cannotSwitchToReflection: string;
    cannotSwitchToRest: string;
  };
  
  // 计时器显示
  timerDisplay: {
    elapsed: string;
    target: string;
    completed: string;
  };
  
  // 设置
  settings: {
    title: string;
    description: string;
    focusDuration: string;
    restDuration: string;
    reflectionDuration: string;
    focusFailureTime: string;
    enableSound: string;
    enableNotification: string;
    save: string;
    reset: string;
    export: string;
    import: string;
    dataManagement: string;
    dataManagementDescription: string;
    exportSuccess: string;
    exportFailed: string;
    importSuccess: string;
    importFailed: string;
    durationSettings: string;
    notificationSettings: string;
    notificationDescription: string;
    configPreview: string;
    focusFailureHelp: string;
    testSound: string;
    testNotification: string;
    requestPermission: string;
    requesting: string;
    permissionStatus: string;
    granted: string;
    denied: string;
    notRequested: string;
    permissionDeniedHelp: string;
    resetToDefaults: string;
    resetForm: string;
    saveSuccess: string;
    saveFailed: string;
    validationError: string;
    permissionGranted: string;
    permissionDenied: string;
    permissionRequestFailed: string;
    soundTestComplete: string;
    soundTestFailed: string;
    notificationTestSent: string;
    notificationTestFailed: string;
    previewError: string;
    previewText: string;
    validation: {
      focusDurationMin: string;
      focusDurationMax: string;
      restDurationMin: string;
      restDurationMax: string;
      reflectionDurationMin: string;
      reflectionDurationMax: string;
      focusFailureTimeMin: string;
      focusFailureTimeMax: string;
      focusFailureTimeExceedsFocus: string;
      focusFailureTimeMustBeLess: string;
    };
  };
  
  // 统计
  statistics: {
    title: string;
    today: string;
    week: string;
    month: string;
    totalFocusTime: string;
    totalReflectionTime: string;
    totalRestTime: string;
    focusSessionCount: string;
    failedFocusCount: string;
    averageFocusTime: string;
    year: string;
    all: string;
    loadFailed: string;
    loadError: string;
    noData: string;
    noStatistics: string;
    noTrendData: string;
    noTimeData: string;
    noDurationData: string;
    noActivityData: string;
    average: string;
    failedCount: string;
    completionRate: string;
    focusCompletionRate: string;
    totalSessions: string;
    dailyAverage: string;
    focusTrend: string;
    timeDistribution: string;
    durationDistribution: string;
    activityHeatmap: string;
    detailedStats: string;
    averageSessionDuration: string;
    longestSession: string;
    shortestSession: string;
    longestFocusStreak: string;
    streakCount: string;
    less: string;
    more: string;
  };
  
  // 历史记录
  history: {
    title: string;
    noRecords: string;
    completed: string;
    failed: string;
    interrupted: string;
    incomplete: string;
    success: string;
    unknown: string;
    today: string;
    yesterday: string;
    target: string;
    wasInterrupted: string;
    hasReflection: string;
    details: string;
    startTime: string;
    endTime: string;
    duration: string;
    completionStatus: string;
    focusResult: string;
    targetDuration: string;
    interruptedStatus: string;
    yes: string;
    recordId: string;
    reflectionSummary: string;
    createdAt: string;
    updatedAt: string;
    noContent: string;
    loadFailed: string;
    loadError: string;
    totalRecords: string;
    focusCount: string;
    failedCount: string;
    reflectionCount: string;
    restCount: string;
    searchPlaceholder: string;
    allTime: string;
    todayFilter: string;
    thisWeek: string;
    thisMonth: string;
    allTypes: string;
    focusFailed: string;
    sortNewest: string;
    sortOldest: string;
    sortDurationDesc: string;
    sortDurationAsc: string;
    noMatchingRecords: string;
    clearFilters: string;
    previousPage: string;
    nextPage: string;
    pageInfo: string;
  };
  
  // 反思
  reflection: {
    title: string;
    placeholder: string;
    save: string;
    preview: string;
    edit: string;
  };
  
  // 导航
  navigation: {
    timer: string;
    help: string;
    toggleTheme: string;
    darkTheme: string;
    lightTheme: string;
  };
  
  // 帮助页面
  help: {
    title: string;
    subtitle: string;
    gettingStarted: {
      title: string;
      step1: {
        title: string;
        description: string;
      };
      step2: {
        title: string;
        description: string;
      };
      step3: {
        title: string;
        description: string;
      };
    };
    features: {
      title: string;
      flexibleTimer: {
        title: string;
        description: string;
      };
      reflection: {
        title: string;
        description: string;
      };
      statistics: {
        title: string;
        description: string;
      };
      customization: {
        title: string;
        description: string;
      };
    };
    states: {
      title: string;
      focus: string;
      reflection: string;
      rest: string;
      idle: string;
    };
    tips: {
      title: string;
      tip1: string;
      tip2: string;
      tip3: string;
      tip4: string;
    };
    faq: {
      title: string;
      q1: {
        question: string;
        answer: string;
      };
      q2: {
        question: string;
        answer: string;
      };
      q3: {
        question: string;
        answer: string;
      };
      q4: {
        question: string;
        answer: string;
      };
    };
  };
  
  // 错误边界
  errorBoundary: {
    title: string;
    retry: string;
    reload: string;
    technicalDetails: string;
    errorType: string;
    timestamp: string;
    stackTrace: string;
    errors: {
      invalidStateTransition: string;
      storageError: string;
      timerSyncError: string;
      configValidationError: string;
      notificationError: string;
      unknownError: string;
    };
  };
  
  // 通用
  common: {
    minutes: string;
    seconds: string;
    hours: string;
    confirm: string;
    cancel: string;
    save: string;
    close: string;
    loading: string;
    error: string;
    retry: string;
  };
  
  // 通知
  notifications: {
    testTitle: string;
    testBody: string;
    timeReached: {
      title: string;
      body: string;
    };
    stateChanged: {
      title: string;
      body: string;
    };
    sessionCompleted: {
      title: string;
      body: string;
    };
    focusFailed: {
      title: string;
      body: string;
    };
  };
  
  // 确认对话框
  dialogs: {
    switchToFocus: {
      title: string;
      message: string;
    };
    switchToReflection: {
      title: string;
      message: string;
    };
    switchToRest: {
      title: string;
      message: string;
    };
    cancelFocus: {
      title: string;
      message: string;
    };
    cancelActivity: {
      title: string;
      message: string;
    };
  };
}

// 中文翻译
const zhMessages: I18nMessages = {
  appName: 'Time Tracker',
  
  states: {
    idle: '空闲',
    focus: '专注',
    reflection: '反思',
    rest: '休息'
  },
  
  controlPanel: {
    title: '操作面板',
    startFocus: '开始专注',
    startReflection: '开始反思',
    startRest: '开始休息',
    cancel: '取消',
    reflectionSummary: '反思总结',
    currentStatus: '当前状态',
    focusLocked: '专注锁定中，需要达到最小专注时间（{minutes}分钟）才能切换状态',
    focusLockedInfo: '当前已在专注状态。如需重新开始，请先点击"取消"结束当前专注。',
    alreadyFocusing: '当前已在专注状态，请先取消当前专注再开始新的专注',
    timeReached: '已达到预设时间！您可以继续当前状态或切换到其他状态。',
    actionFailed: '执行{action}失败，请重试',
    cannotStartFocus: '当前状态无法开始专注',
    needMinFocusTime: '需要达到最小专注时间才能切换',
    cannotSwitchToReflection: '当前状态无法切换到反思',
    cannotSwitchToRest: '当前状态无法切换到休息'
  },
  
  timerDisplay: {
    elapsed: '已用时间',
    target: '目标时间',
    completed: '已完成'
  },
  
  settings: {
    title: '设置',
    description: '配置您的番茄时钟参数和偏好设置',
    focusDuration: '专注时长',
    restDuration: '休息时长',
    reflectionDuration: '反思时长',
    focusFailureTime: '专注失败时间',
    enableSound: '启用声音提醒',
    enableNotification: '启用桌面通知',
    save: '保存',
    reset: '重置',
    export: '导出',
    import: '导入',
    dataManagement: '数据管理',
    dataManagementDescription: '导出你的数据进行备份，或导入之前备份的数据来恢复设置和历史记录',
    exportSuccess: '数据导出成功',
    exportFailed: '数据导出失败，请重试',
    importSuccess: '数据导入成功',
    importFailed: '数据导入失败，请检查文件格式',
    durationSettings: '时长设置',
    notificationSettings: '通知设置',
    notificationDescription: '配置声音提醒和桌面通知，让您不错过任何重要时刻',
    configPreview: '配置预览',
    focusFailureHelp: '在此时间内取消专注将被记录为专注失败',
    testSound: '🔊 测试声音',
    testNotification: '📢 测试通知',
    requestPermission: '🔔 请求通知权限',
    requesting: '请求中...',
    permissionStatus: '权限状态',
    granted: '✅ 已授权',
    denied: '❌ 已拒绝',
    notRequested: '⏳ 未请求',
    permissionDeniedHelp: '⚠️ 通知权限已被拒绝，请在浏览器地址栏左侧的锁图标中手动开启通知权限',
    resetToDefaults: '恢复默认设置',
    resetForm: '重置',
    saveSuccess: '设置已保存',
    saveFailed: '保存失败，请重试',
    validationError: '请修正表单错误后再保存',
    permissionGranted: '通知权限已授予',
    permissionDenied: '通知权限被拒绝，请在浏览器设置中手动开启',
    permissionRequestFailed: '请求通知权限失败',
    soundTestComplete: '声音测试完成',
    soundTestFailed: '声音测试失败，请检查浏览器设置',
    notificationTestSent: '测试通知已发送',
    notificationTestFailed: '测试通知失败，请检查通知权限',
    previewError: '请修正错误后查看预览',
    previewText: '专注 {focusDuration} 分钟，反思 {reflectionDuration} 分钟，休息 {restDuration} 分钟。专注失败时间为 {focusFailureTime} 分钟。',
    validation: {
      focusDurationMin: '专注时长必须大于0分钟',
      focusDurationMax: '专注时长不能超过120分钟',
      restDurationMin: '休息时长必须大于0分钟',
      restDurationMax: '休息时长不能超过60分钟',
      reflectionDurationMin: '反思时长必须大于0分钟',
      reflectionDurationMax: '反思时长不能超过30分钟',
      focusFailureTimeMin: '专注失败时间必须大于0分钟',
      focusFailureTimeMax: '专注失败时间不能超过10分钟',
      focusFailureTimeExceedsFocus: '专注失败时间不能超过专注时长',
      focusFailureTimeMustBeLess: '专注失败时间必须小于专注时长'
    }
  },
  
  statistics: {
    title: '统计',
    today: '今日',
    week: '本周',
    month: '本月',
    totalFocusTime: '总专注时间',
    totalReflectionTime: '总反思时间',
    totalRestTime: '总休息时间',
    focusSessionCount: '专注次数',
    failedFocusCount: '失败次数',
    averageFocusTime: '平均专注时间',
    year: '本年',
    all: '全部',
    loadFailed: '加载统计数据失败',
    loadError: '加载失败',
    noData: '暂无数据',
    noStatistics: '暂无统计数据',
    noTrendData: '暂无趋势数据',
    noTimeData: '暂无时间分布数据',
    noDurationData: '暂无时长分布数据',
    noActivityData: '暂无活动数据',
    average: '平均 {value}',
    failedCount: '失败 {count} 次',
    completionRate: '完成率',
    focusCompletionRate: '专注完成率 {rate}',
    totalSessions: '总会话数',
    dailyAverage: '日均 {value} 次',
    focusTrend: '专注时间趋势',
    timeDistribution: '时间分布',
    durationDistribution: '专注时长分布',
    activityHeatmap: '活动热力图',
    detailedStats: '详细统计',
    averageSessionDuration: '平均会话时长',
    longestSession: '最长会话',
    shortestSession: '最短会话',
    longestFocusStreak: '最长连续专注',
    streakCount: '{count} 次',
    less: '少',
    more: '多'
  },
  
  history: {
    title: '历史记录',
    noRecords: '暂无记录',
    completed: '已完成',
    failed: '失败',
    interrupted: '中断',
    incomplete: '未完成',
    success: '成功',
    unknown: '未知',
    today: '今天 {time}',
    yesterday: '昨天 {time}',
    target: '目标',
    wasInterrupted: '被中断',
    hasReflection: '包含反思总结',
    details: '{type}详情',
    startTime: '开始时间',
    endTime: '结束时间',
    duration: '持续时间',
    completionStatus: '完成状态',
    focusResult: '专注结果',
    targetDuration: '目标时长',
    interruptedStatus: '中断状态',
    yes: '是',
    recordId: '记录ID',
    reflectionSummary: '反思总结',
    createdAt: '创建于',
    updatedAt: '更新于',
    noContent: '暂无内容',
    loadFailed: '加载历史记录失败',
    loadError: '加载失败',
    totalRecords: '共 {count} 条记录',
    focusCount: '专注 {count} 次',
    failedCount: '失败 {count} 次',
    reflectionCount: '反思 {count} 次',
    restCount: '休息 {count} 次',
    searchPlaceholder: '搜索记录...',
    allTime: '全部时间',
    todayFilter: '今日',
    thisWeek: '本周',
    thisMonth: '本月',
    allTypes: '全部类型',
    focusFailed: '专注失败',
    sortNewest: '最新优先',
    sortOldest: '最旧优先',
    sortDurationDesc: '时长降序',
    sortDurationAsc: '时长升序',
    noMatchingRecords: '没有找到匹配的记录',
    clearFilters: '清除筛选',
    previousPage: '上一页',
    nextPage: '下一页',
    pageInfo: '第 {current} 页，共 {total} 页'
  },
  
  reflection: {
    title: '反思总结',
    placeholder: '在这里记录您的反思和总结...',
    save: '保存',
    preview: '预览',
    edit: '编辑'
  },
  
  navigation: {
    timer: '计时器',
    help: '使用说明',
    toggleTheme: '切换到{theme}主题',
    darkTheme: '深色',
    lightTheme: '浅色'
  },
  
  help: {
    title: '使用说明',
    subtitle: '学会如何使用灵活番茄时钟来提高你的工作效率',
    gettingStarted: {
      title: '快速入门',
      step1: {
        title: '配置你的时间',
        description: '在设置页面中调整专注、反思和休息的时长，以及专注失败时间。这些设置将根据你的个人习惯进行调整。'
      },
      step2: {
        title: '开始你的第一次专注',
        description: '点击“开始专注”按钮开始你的第一个专注会话。计时器将开始计时，你可以专心工作。'
      },
      step3: {
        title: '灵活切换状态',
        description: '当达到预设时间后，你可以选择继续专注或切换到反思或休息状态。这种灵活性让你能够根据实际情况调整工作节奏。'
      }
    },
    features: {
      title: '主要功能',
      flexibleTimer: {
        title: '灵活计时',
        description: '与传统番茄时钟不同，达到预设时间后不会强制中断，你可以继续当前状态或手动切换。'
      },
      reflection: {
        title: '反思总结',
        description: '在反思状态下可以记录你的思考和总结，支持 Markdown 格式，帮助你更好地回顾和改进。'
      },
      statistics: {
        title: '详细统计',
        description: '提供丰富的统计图表，包括时间趋势、时长分布、活动热力图等，让你清晰了解自己的时间使用情况。'
      },
      customization: {
        title: '个性化设置',
        description: '可以自定义各种时长参数、通知设置、主题风格等，打造属于你的个性化时间管理工具。'
      }
    },
    states: {
      title: '状态说明',
      focus: '专注于当前任务，提高工作效率。在达到最小专注时间后才能切换到其他状态。',
      reflection: '回顾和总结刚才的专注成果，记录思考和感惟，为下次专注做准备。',
      rest: '放松和恢复精力，可以做一些轻松的活动，为下一轮专注做准备。',
      idle: '空闲状态，可以选择开始专注、反思或休息中的任意一种状态。'
    },
    tips: {
      title: '使用技巧',
      tip1: '建议先设置合适的时间参数，根据个人习惯调整专注时长和休息时间。',
      tip2: '开启通知权限可以让你在达到目标时间时及时收到提醒，不错过任何重要时刻。',
      tip3: '在反思状态下记录你的思考和总结，这有助于提高工作质量和自我认知。',
      tip4: '定期查看统计数据，分析自己的时间使用模式，找到改进的空间。'
    },
    faq: {
      title: '常见问题',
      q1: {
        question: '为什么在专注状态下不能立即切换到其他状态？',
        answer: '这是为了防止频繁切换影响专注效果。只有在达到最小专注时间（可在设置中调整）后才能切换状态。如果在此之前取消，将被记录为专注失败。'
      },
      q2: {
        question: '如何开启浏览器通知？',
        answer: '在设置页面中点击“请求通知权限”按钮，浏览器会弹出权限请求对话框。如果被拒绝，可以在浏览器地址栏左侧的锁图标中手动开启。'
      },
      q3: {
        question: '反思总结支持哪些格式？',
        answer: '反思总结支持 Markdown 格式，包括标题、列表、粗体、斜体、链接等基础语法。你可以使用这些格式来结构化你的反思内容。'
      },
      q4: {
        question: '数据会保存在哪里？',
        answer: '所有数据都保存在浏览器的本地存储中，不会上传到任何服务器。请注意定期备份重要数据，并避免清理浏览器数据。'
      }
    }
  },
  
  errorBoundary: {
    title: '出现了一些问题',
    retry: '重试',
    reload: '刷新页面',
    technicalDetails: '技术详情',
    errorType: '错误类型',
    timestamp: '时间',
    stackTrace: '堆栈信息',
    errors: {
      invalidStateTransition: '计时器状态切换出现问题，请重试或刷新页面。',
      storageError: '数据保存出现问题，您的设置可能无法保存。请检查浏览器存储权限。',
      timerSyncError: '计时器同步出现问题，时间显示可能不准确。',
      configValidationError: '配置验证失败，将使用默认设置。',
      notificationError: '通知功能出现问题，您可能无法收到提醒。',
      unknownError: '应用出现未知错误，请尝试刷新页面。如果问题持续存在，请联系支持。'
    }
  },
  
  common: {
    minutes: '分钟',
    seconds: '秒',
    hours: '小时',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    close: '关闭',
    loading: '加载中...',
    error: '错误',
    retry: '重试'
  },
  
  notifications: {
    testTitle: '🧪 测试通知',
    testBody: '这是一个测试通知，如果您看到了这条消息，说明通知功能正常工作！',
    timeReached: {
      title: '{emoji} 时间提醒',
      body: '{stateName}时间已达到 {minutes} 分钟，您可以继续或切换状态'
    },
    stateChanged: {
      title: '{emoji} 状态切换',
      body: '已从{fromState}切换到{toState}'
    },
    sessionCompleted: {
      title: '{emoji} 会话完成',
      body: '{stateName}会话完成，持续了 {minutes} 分钟，做得很好！'
    },
    focusFailed: {
      title: '⚠️ 专注中断',
      body: '专注在 {minutes} 分钟后被中断，没关系，下次会更好！'
    }
  },
  
  dialogs: {
    switchToFocus: {
      title: '切换到专注状态',
      message: '当前正在进行其他活动，切换到专注状态将结束当前活动。确定要继续吗？'
    },
    switchToReflection: {
      title: '切换到反思状态',
      message: '结束当前专注并开始反思。这将记录您的专注时间。确定要继续吗？'
    },
    switchToRest: {
      title: '切换到休息状态',
      message: '结束当前{currentState}并开始休息。这将记录您的{currentState}时间。确定要继续吗？'
    },
    cancelFocus: {
      title: '取消专注',
      message: '当前专注时间较短，取消将被记录为专注失败。确定要取消吗？'
    },
    cancelActivity: {
      title: '取消{currentState}',
      message: '确定要取消当前{currentState}吗？这将结束当前活动并返回空闲状态。'
    }
  }
};

// 英文翻译
const enMessages: I18nMessages = {
  appName: 'Time Tracker',
  
  states: {
    idle: 'Idle',
    focus: 'Focus',
    reflection: 'Reflection',
    rest: 'Rest'
  },
  
  controlPanel: {
    title: 'Control Panel',
    startFocus: 'Start Focus',
    startReflection: 'Start Reflection',
    startRest: 'Start Rest',
    cancel: 'Cancel',
    reflectionSummary: 'Reflection Summary',
    currentStatus: 'Current Status',
    focusLocked: 'Focus locked, need to reach minimum focus time ({minutes} minutes) to switch state',
    focusLockedInfo: 'Currently in focus state. To restart, please click "Cancel" to end current focus first.',
    alreadyFocusing: 'Already in focus state, please cancel current focus before starting new focus',
    timeReached: 'Target time reached! You can continue current state or switch to other states.',
    actionFailed: 'Execute {action} failed, please try again',
    cannotStartFocus: 'Cannot start focus in current state',
    needMinFocusTime: 'Need to reach minimum focus time to switch',
    cannotSwitchToReflection: 'Cannot switch to reflection in current state',
    cannotSwitchToRest: 'Cannot switch to rest in current state'
  },
  
  timerDisplay: {
    elapsed: 'Elapsed Time',
    target: 'Target Time',
    completed: 'Completed'
  },
  
  settings: {
    title: 'Settings',
    description: 'Configure your pomodoro timer parameters and preferences',
    focusDuration: 'Focus Duration',
    restDuration: 'Rest Duration',
    reflectionDuration: 'Reflection Duration',
    focusFailureTime: 'Focus Failure Time',
    enableSound: 'Enable Sound',
    enableNotification: 'Enable Notification',
    save: 'Save',
    reset: 'Reset',
    export: 'Export',
    import: 'Import',
    dataManagement: 'Data Management',
    dataManagementDescription: 'Export your data for backup, or import previously backed up data to restore settings and history records',
    exportSuccess: 'Data exported successfully',
    exportFailed: 'Data export failed, please try again',
    importSuccess: 'Data imported successfully',
    importFailed: 'Data import failed, please check file format',
    durationSettings: 'Duration Settings',
    notificationSettings: 'Notification Settings',
    notificationDescription: 'Configure sound alerts and desktop notifications to never miss important moments',
    configPreview: 'Configuration Preview',
    focusFailureHelp: 'Canceling focus within this time will be recorded as focus failure',
    testSound: '🔊 Test Sound',
    testNotification: '📢 Test Notification',
    requestPermission: '🔔 Request Notification Permission',
    requesting: 'Requesting...',
    permissionStatus: 'Permission Status',
    granted: '✅ Granted',
    denied: '❌ Denied',
    notRequested: '⏳ Not Requested',
    permissionDeniedHelp: '⚠️ Notification permission denied. Please manually enable notifications in browser address bar lock icon',
    resetToDefaults: 'Reset to Defaults',
    resetForm: 'Reset',
    saveSuccess: 'Settings saved',
    saveFailed: 'Save failed, please try again',
    validationError: 'Please fix form errors before saving',
    permissionGranted: 'Notification permission granted',
    permissionDenied: 'Notification permission denied, please enable manually in browser settings',
    permissionRequestFailed: 'Failed to request notification permission',
    soundTestComplete: 'Sound test completed',
    soundTestFailed: 'Sound test failed, please check browser settings',
    notificationTestSent: 'Test notification sent',
    notificationTestFailed: 'Test notification failed, please check notification permission',
    previewError: 'Please fix errors to view preview',
    previewText: 'Focus {focusDuration} minutes, reflect {reflectionDuration} minutes, rest {restDuration} minutes. Focus failure time is {focusFailureTime} minutes.',
    validation: {
      focusDurationMin: 'Focus duration must be greater than 0 minutes',
      focusDurationMax: 'Focus duration cannot exceed 120 minutes',
      restDurationMin: 'Rest duration must be greater than 0 minutes',
      restDurationMax: 'Rest duration cannot exceed 60 minutes',
      reflectionDurationMin: 'Reflection duration must be greater than 0 minutes',
      reflectionDurationMax: 'Reflection duration cannot exceed 30 minutes',
      focusFailureTimeMin: 'Focus failure time must be greater than 0 minutes',
      focusFailureTimeMax: 'Focus failure time cannot exceed 10 minutes',
      focusFailureTimeExceedsFocus: 'Focus failure time cannot exceed focus duration',
      focusFailureTimeMustBeLess: 'Focus failure time must be less than focus duration'
    }
  },
  
  statistics: {
    title: 'Statistics',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    totalFocusTime: 'Total Focus Time',
    totalReflectionTime: 'Total Reflection Time',
    totalRestTime: 'Total Rest Time',
    focusSessionCount: 'Focus Sessions',
    failedFocusCount: 'Failed Sessions',
    averageFocusTime: 'Average Focus Time',
    year: 'This Year',
    all: 'All Time',
    loadFailed: 'Failed to load statistics',
    loadError: 'Load failed',
    noData: 'No data',
    noStatistics: 'No statistics data',
    noTrendData: 'No trend data',
    noTimeData: 'No time distribution data',
    noDurationData: 'No duration distribution data',
    noActivityData: 'No activity data',
    average: 'Average {value}',
    failedCount: 'Failed {count} times',
    completionRate: 'Completion Rate',
    focusCompletionRate: 'Focus completion rate {rate}',
    totalSessions: 'Total Sessions',
    dailyAverage: 'Daily average {value} times',
    focusTrend: 'Focus Time Trend',
    timeDistribution: 'Time Distribution',
    durationDistribution: 'Focus Duration Distribution',
    activityHeatmap: 'Activity Heatmap',
    detailedStats: 'Detailed Statistics',
    averageSessionDuration: 'Average Session Duration',
    longestSession: 'Longest Session',
    shortestSession: 'Shortest Session',
    longestFocusStreak: 'Longest Focus Streak',
    streakCount: '{count} times',
    less: 'Less',
    more: 'More'
  },
  
  history: {
    title: 'History',
    noRecords: 'No records',
    completed: 'Completed',
    failed: 'Failed',
    interrupted: 'Interrupted',
    incomplete: 'Incomplete',
    success: 'Success',
    unknown: 'Unknown',
    today: 'Today {time}',
    yesterday: 'Yesterday {time}',
    target: 'Target',
    wasInterrupted: 'Interrupted',
    hasReflection: 'Contains reflection summary',
    details: '{type} Details',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    completionStatus: 'Completion Status',
    focusResult: 'Focus Result',
    targetDuration: 'Target Duration',
    interruptedStatus: 'Interrupted Status',
    yes: 'Yes',
    recordId: 'Record ID',
    reflectionSummary: 'Reflection Summary',
    createdAt: 'Created at',
    updatedAt: 'Updated at',
    noContent: 'No content',
    loadFailed: 'Failed to load history records',
    loadError: 'Load failed',
    totalRecords: 'Total {count} records',
    focusCount: 'Focus {count} times',
    failedCount: 'Failed {count} times',
    reflectionCount: 'Reflection {count} times',
    restCount: 'Rest {count} times',
    searchPlaceholder: 'Search records...',
    allTime: 'All Time',
    todayFilter: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allTypes: 'All Types',
    focusFailed: 'Focus Failed',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortDurationDesc: 'Duration Descending',
    sortDurationAsc: 'Duration Ascending',
    noMatchingRecords: 'No matching records found',
    clearFilters: 'Clear Filters',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageInfo: 'Page {current} of {total}'
  },
  
  reflection: {
    title: 'Reflection Summary',
    placeholder: 'Record your reflections and summary here...',
    save: 'Save',
    preview: 'Preview',
    edit: 'Edit'
  },
  
  navigation: {
    timer: 'Timer',
    help: 'Help',
    toggleTheme: 'Switch to {theme} theme',
    darkTheme: 'dark',
    lightTheme: 'light'
  },
  
  help: {
    title: 'User Guide',
    subtitle: 'Learn how to use the Flexible Pomodoro Timer to boost your productivity',
    gettingStarted: {
      title: 'Getting Started',
      step1: {
        title: 'Configure Your Time',
        description: 'Adjust the duration for focus, reflection, and rest periods in the settings page, as well as the focus failure time. These settings will be tailored to your personal habits.'
      },
      step2: {
        title: 'Start Your First Focus',
        description: 'Click the "Start Focus" button to begin your first focus session. The timer will start counting, and you can concentrate on your work.'
      },
      step3: {
        title: 'Flexible State Switching',
        description: 'When you reach the preset time, you can choose to continue focusing or switch to reflection or rest state. This flexibility allows you to adjust your work rhythm according to actual situations.'
      }
    },
    features: {
      title: 'Key Features',
      flexibleTimer: {
        title: 'Flexible Timer',
        description: 'Unlike traditional pomodoro timers, it won\'t force interruption after reaching preset time. You can continue the current state or manually switch.'
      },
      reflection: {
        title: 'Reflection Summary',
        description: 'Record your thoughts and summaries in reflection state, supports Markdown format, helping you better review and improve.'
      },
      statistics: {
        title: 'Detailed Statistics',
        description: 'Provides rich statistical charts including time trends, duration distribution, activity heatmap, etc., giving you clear insights into your time usage.'
      },
      customization: {
        title: 'Personalization',
        description: 'Customize various duration parameters, notification settings, theme styles, etc., to create your personalized time management tool.'
      }
    },
    states: {
      title: 'State Descriptions',
      focus: 'Focus on current tasks to improve work efficiency. Can only switch to other states after reaching minimum focus time.',
      reflection: 'Review and summarize recent focus achievements, record thoughts and insights, prepare for next focus session.',
      rest: 'Relax and restore energy, do some light activities, prepare for the next round of focus.',
      idle: 'Idle state, you can choose to start any of focus, reflection, or rest states.'
    },
    tips: {
      title: 'Usage Tips',
      tip1: 'It\'s recommended to set appropriate time parameters first, adjusting focus duration and rest time according to personal habits.',
      tip2: 'Enable notification permissions to receive timely reminders when reaching target time, never missing important moments.',
      tip3: 'Record your thoughts and summaries in reflection state, which helps improve work quality and self-awareness.',
      tip4: 'Regularly check statistical data, analyze your time usage patterns, and find areas for improvement.'
    },
    faq: {
      title: 'Frequently Asked Questions',
      q1: {
        question: 'Why can\'t I immediately switch to other states during focus?',
        answer: 'This is to prevent frequent switching from affecting focus effectiveness. You can only switch states after reaching the minimum focus time (adjustable in settings). If canceled before this, it will be recorded as focus failure.'
      },
      q2: {
        question: 'How to enable browser notifications?',
        answer: 'Click the "Request Notification Permission" button in the settings page, and the browser will show a permission request dialog. If denied, you can manually enable it in the lock icon on the left side of the browser address bar.'
      },
      q3: {
        question: 'What formats does reflection summary support?',
        answer: 'Reflection summary supports Markdown format, including basic syntax like headings, lists, bold, italic, links, etc. You can use these formats to structure your reflection content.'
      },
      q4: {
        question: 'Where is the data saved?',
        answer: 'All data is saved in the browser\'s local storage and will not be uploaded to any server. Please note to regularly backup important data and avoid clearing browser data.'
      }
    }
  },
  
  errorBoundary: {
    title: 'Something went wrong',
    retry: 'Retry',
    reload: 'Reload Page',
    technicalDetails: 'Technical Details',
    errorType: 'Error Type',
    timestamp: 'Timestamp',
    stackTrace: 'Stack Trace',
    errors: {
      invalidStateTransition: 'Timer state transition error occurred, please retry or refresh the page.',
      storageError: 'Data storage error occurred, your settings may not be saved. Please check browser storage permissions.',
      timerSyncError: 'Timer synchronization error occurred, time display may be inaccurate.',
      configValidationError: 'Configuration validation failed, default settings will be used.',
      notificationError: 'Notification feature error occurred, you may not receive alerts.',
      unknownError: 'Unknown application error occurred, please try refreshing the page. If the problem persists, please contact support.'
    }
  },
  
  common: {
    minutes: 'minutes',
    seconds: 'seconds',
    hours: 'hours',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry'
  },
  
  notifications: {
    testTitle: '🧪 Test Notification',
    testBody: 'This is a test notification. If you see this message, the notification feature is working properly!',
    timeReached: {
      title: '{emoji} Time Reminder',
      body: '{stateName} time has reached {minutes} minutes, you can continue or switch state'
    },
    stateChanged: {
      title: '{emoji} State Changed',
      body: 'Switched from {fromState} to {toState}'
    },
    sessionCompleted: {
      title: '{emoji} Session Completed',
      body: '{stateName} session completed, lasted {minutes} minutes, well done!'
    },
    focusFailed: {
      title: '⚠️ Focus Interrupted',
      body: 'Focus was interrupted after {minutes} minutes, no worries, next time will be better!'
    }
  },
  
  dialogs: {
    switchToFocus: {
      title: 'Switch to Focus',
      message: 'Currently in other activity, switching to focus will end current activity. Continue?'
    },
    switchToReflection: {
      title: 'Switch to Reflection',
      message: 'End current focus and start reflection. This will record your focus time. Continue?'
    },
    switchToRest: {
      title: 'Switch to Rest',
      message: 'End current {currentState} and start rest. This will record your {currentState} time. Continue?'
    },
    cancelFocus: {
      title: 'Cancel Focus',
      message: 'Current focus time is short, canceling will be recorded as focus failure. Continue?'
    },
    cancelActivity: {
      title: 'Cancel {currentState}',
      message: 'Are you sure to cancel current {currentState}? This will end current activity and return to idle state.'
    }
  }
};

const messages = {
  zh: zhMessages,
  en: enMessages
};

// 当前语言
let currentLanguage: Language = 'zh';

// 获取当前语言
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

// 设置语言
export function setLanguage(language: Language): void {
  currentLanguage = language;
  localStorage.setItem('time-tracker-language', language);
}

// 初始化语言
export function initializeLanguage(): void {
  const saved = localStorage.getItem('time-tracker-language') as Language;
  if (saved && (saved === 'zh' || saved === 'en')) {
    currentLanguage = saved;
  } else {
    // 根据浏览器语言自动选择
    const browserLang = navigator.language.toLowerCase();
    currentLanguage = browserLang.startsWith('zh') ? 'zh' : 'en';
  }
}

// 获取翻译文本
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = messages[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation value is not string: ${key}`);
    return key;
  }
  
  // 替换参数
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return value;
}

// 获取所有消息
export function getMessages(): I18nMessages {
  return messages[currentLanguage];
}