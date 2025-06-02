use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use calamine::{Reader, Xlsx, open_workbook, Data};
use std::collections::HashMap;
use chrono::{NaiveDate, Datelike};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisResult {
    pub reader_name: String,
    pub borrow_frequency: u32,
    pub total_reading_duration: u32,
    pub total_price: f64,
    pub most_frequent_author: String,
    pub most_frequent_category: String,
    pub longest_author: String,
    pub longest_category: String,
    pub borrow_peak_yearmonth: String,
    pub most_borrowed_book: String,
    pub most_borrowed_book_count: u32,
    pub total_full_attendance: u32,
    pub monthly_borrow: HashMap<String, u32>,
    pub book_borrow_counts: HashMap<String, u32>,
    pub full_attendance: Vec<String>,
}

#[derive(Debug, Clone)]
struct BorrowRecord {
    reader_name: String,
    book_title: String,
    author: String,
    category: String,
    borrow_date: NaiveDate,
    return_date: Option<NaiveDate>,
    price: f64,
    file_source: String, // 添加文件来源信息
}

#[derive(Debug, Clone)]
struct ReaderInfo {
    name: String,
    card_number: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReaderFileInfo {
    pub file_path: String,
    pub primary_reader_name: String,
    pub record_count: usize,
}

pub struct RustAnalyzer {
    borrow_records: Vec<BorrowRecord>,
    reader_info: Vec<ReaderInfo>,
    reader_files: Vec<ReaderFileInfo>, // 添加文件信息管理
}

impl RustAnalyzer {
    pub fn new() -> Self {
        Self {
            borrow_records: Vec::new(),
            reader_info: Vec::new(),
            reader_files: Vec::new(),
        }
    }

    pub fn load_excel_files(
        &mut self,
        reader_list_path: &str,
        borrow_paths: &[String],
    ) -> Result<()> {
        println!("开始加载Excel文件...");
        println!("读者清单路径: {}", reader_list_path);
        println!("借阅数据路径: {:?}", borrow_paths);
        
        // 清空之前的数据，防止累加
        self.borrow_records.clear();
        self.reader_info.clear();
        self.reader_files.clear();
        
        // 加载读者清单
        println!("正在加载读者清单...");
        self.load_reader_list(reader_list_path)?;
        println!("读者清单加载完成，共 {} 个读者", self.reader_info.len());
        
        // 加载借阅数据并记录文件信息
        for (i, path) in borrow_paths.iter().enumerate() {
            println!("正在加载借阅数据文件 {}: {}", i + 1, path);
            let records_before = self.borrow_records.len();
            self.load_borrow_data(path)?;
            let records_after = self.borrow_records.len();
            let records_count = records_after - records_before;
            
            // 分析该文件的主要读者姓名
            let file_records: Vec<&BorrowRecord> = self.borrow_records[records_before..records_after]
                .iter()
                .collect();
            let primary_reader_name = self.get_primary_reader_name(&file_records);
            
            // 记录文件信息
            self.reader_files.push(ReaderFileInfo {
                file_path: path.clone(),
                primary_reader_name,
                record_count: records_count,
            });
        }

        println!("数据加载完成！已加载 {} 条借阅记录，{} 个读者文件",
                self.borrow_records.len(),
                self.reader_files.len());

        if self.borrow_records.is_empty() {
            return Err(anyhow!("没有加载到任何借阅记录，请检查Excel文件格式"));
        }

        Ok(())
    }

    fn load_reader_list(&mut self, path: &str) -> Result<()> {
        let mut workbook: Xlsx<_> = open_workbook(path)
            .map_err(|e| anyhow!("无法打开读者清单文件: {}", e))?;
        
        let worksheet = workbook
            .worksheet_range_at(0)
            .ok_or_else(|| anyhow!("读者清单文件没有工作表"))?
            .map_err(|e| anyhow!("读取工作表失败: {}", e))?;

        println!("读者清单文件有 {} 行数据", worksheet.height());
        
        for (row_idx, row) in worksheet.rows().enumerate() {
            if row_idx == 0 {
                println!("跳过标题行: {:?}", row.iter().map(|c| self.cell_to_string(c)).collect::<Vec<_>>());
                continue;
            }
            
            // 根据原型脚本，读者清单可能有多列：序号、账号、卡号、姓名、性别、类别、状态、办卡日期、截止日期、操作日期
            // 我们主要需要姓名（第4列，索引3）和卡号（第3列，索引2）
            if row.len() >= 4 {
                let card_number = self.cell_to_string(&row[2]).trim().to_string(); // 卡号在第3列
                let name = self.cell_to_string(&row[3]).trim().to_string(); // 姓名在第4列
                
                println!("处理读者: {} (卡号: {})", name, card_number);
                
                if !name.is_empty() && !card_number.is_empty() {
                    self.reader_info.push(ReaderInfo {
                        name,
                        card_number,
                    });
                }
            } else if row.len() >= 2 {
                // 如果只有2列，假设是简化格式：姓名、卡号
                let name = self.cell_to_string(&row[0]).trim().to_string();
                let card_number = self.cell_to_string(&row[1]).trim().to_string();
                
                println!("处理读者（简化格式）: {} (卡号: {})", name, card_number);
                
                if !name.is_empty() && !card_number.is_empty() {
                    self.reader_info.push(ReaderInfo {
                        name,
                        card_number,
                    });
                }
            } else {
                println!("第 {} 行数据不完整，只有 {} 列", row_idx + 1, row.len());
            }
        }

        println!("读者清单加载完成，共加载 {} 个读者", self.reader_info.len());
        Ok(())
    }

    fn load_borrow_data(&mut self, path: &str) -> Result<()> {
        let mut workbook: Xlsx<_> = open_workbook(path)
            .map_err(|e| anyhow!("无法打开借阅数据文件 {}: {}", path, e))?;
        
        let worksheet = workbook
            .worksheet_range_at(0)
            .ok_or_else(|| anyhow!("借阅数据文件没有工作表: {}", path))?
            .map_err(|e| anyhow!("读取工作表失败: {}", e))?;

        println!("借阅数据文件有 {} 行数据", worksheet.height());
        let mut records_loaded = 0;
        
        for (row_idx, row) in worksheet.rows().enumerate() {
            if row_idx == 0 {
                println!("跳过标题行: {:?}", row.iter().map(|c| self.cell_to_string(c)).collect::<Vec<_>>());
                continue;
            }
            
            match self.parse_borrow_record(row, path) {
                Ok(record) => {
                    self.borrow_records.push(record);
                    records_loaded += 1;
                    if records_loaded % 100 == 0 {
                        println!("已成功解析 {} 条记录", records_loaded);
                    }
                }
                Err(e) => {
                    // 只打印前10个错误，避免日志过多
                    if row_idx <= 10 {
                        println!("解析第 {} 行失败: {}", row_idx + 1, e);
                        println!("行数据: {:?}", row.iter().map(|c| self.cell_to_string(c)).collect::<Vec<_>>());
                    }
                }
            }
        }

        println!("从文件 {} 加载了 {} 条借阅记录", path, records_loaded);
        Ok(())
    }

    fn parse_borrow_record(&self, row: &[Data], file_path: &str) -> Result<BorrowRecord> {
        if row.len() < 8 {
            return Err(anyhow!("行数据不完整，至少需要8列，实际有{}列", row.len()));
        }

        // 根据实际Excel文件的列顺序：
        // 0:序号, 1:姓名, 2:书号, 3:书名, 4:作者, 5:出版社, 6:价格, 7:类别, 8:借书日期, 9:还书日期
        let reader_name = self.cell_to_string(&row[1]).trim().to_string();     // 第2列：姓名
        let book_title = self.cell_to_string(&row[3]).trim().to_string();      // 第4列：书名
        let author = self.cell_to_string(&row[4]).trim().to_string();          // 第5列：作者
        let category_code = self.cell_to_string(&row[7]).trim().to_string();   // 第8列：类别
        
        // 转换类别代码为中文名称
        let category = self.categorycode2name(&category_code);
        
        // 解析借书日期（第9列，索引8）
        let borrow_date = if row.len() > 8 {
            self.parse_date(&row[8])?
        } else {
            return Err(anyhow!("缺少借书日期"));
        };
        
        // 解析还书日期（第10列，索引9，可能为空）
        let return_date = if row.len() > 9 && !self.cell_to_string(&row[9]).trim().is_empty() {
            match self.parse_date(&row[9]) {
                Ok(date) => Some(date),
                Err(_) => {
                    // 还书日期解析失败不影响整条记录
                    None
                }
            }
        } else {
            None
        };

        // 解析价格（第7列，索引6）
        let price = if row.len() > 6 {
            self.parse_price(&row[6]).unwrap_or(0.0)
        } else {
            0.0
        };

        // 验证必需字段
        if reader_name.is_empty() {
            return Err(anyhow!("读者姓名不能为空"));
        }
        if book_title.is_empty() {
            return Err(anyhow!("书名不能为空"));
        }

        Ok(BorrowRecord {
            reader_name,
            book_title,
            author,
            category,
            borrow_date,
            return_date,
            price,
            file_source: file_path.to_string(),
        })
    }

    fn cell_to_string(&self, cell: &Data) -> String {
        match cell {
            Data::String(s) => s.clone(),
            Data::Float(f) => f.to_string(),
            Data::Int(i) => i.to_string(),
            Data::Bool(b) => b.to_string(),
            Data::DateTime(dt) => dt.to_string(),
            Data::DateTimeIso(dt) => dt.clone(),
            Data::DurationIso(d) => d.clone(),
            Data::Error(e) => format!("Error: {:?}", e),
            Data::Empty => String::new(),
        }
    }

    fn parse_date(&self, cell: &Data) -> Result<NaiveDate> {
        match cell {
            Data::DateTime(dt) => {
                // ExcelDateTime转换为NaiveDate
                let days_since_1900 = dt.as_f64();
                let base_date = NaiveDate::from_ymd_opt(1899, 12, 30)
                    .ok_or_else(|| anyhow!("无效的基准日期"))?;
                let target_date = base_date + chrono::Duration::days(days_since_1900 as i64);
                println!("从Excel DateTime解析: {} -> {}", days_since_1900, target_date);
                Ok(target_date)
            }
            Data::Float(f) => {
                // 浮点数可能是Excel日期序列号
                let base_date = NaiveDate::from_ymd_opt(1899, 12, 30)
                    .ok_or_else(|| anyhow!("无效的基准日期"))?;
                let target_date = base_date + chrono::Duration::days(*f as i64);
                println!("从Float解析日期: {} -> {}", f, target_date);
                Ok(target_date)
            }
            Data::Int(i) => {
                // 整数可能是Excel日期序列号
                let base_date = NaiveDate::from_ymd_opt(1899, 12, 30)
                    .ok_or_else(|| anyhow!("无效的基准日期"))?;
                let target_date = base_date + chrono::Duration::days(*i as i64);
                println!("从Int解析日期: {} -> {}", i, target_date);
                Ok(target_date)
            }
            Data::String(s) => {
                self.parse_date_string(s)
            }
            Data::Empty => {
                Err(anyhow!("日期单元格为空"))
            }
            _ => {
                println!("未知的日期格式: {:?}", cell);
                Err(anyhow!("无法解析日期格式: {:?}", cell))
            }
        }
    }

    fn parse_date_string(&self, date_str: &str) -> Result<NaiveDate> {
        let date_str = date_str.trim();
        
        if date_str.is_empty() {
            return Err(anyhow!("日期字符串为空"));
        }
        
        // 尝试多种日期格式，包括Excel可能的格式
        let formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%Y年%m月%d日",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y-%m-%d %H:%M:%S", // 包含时间的格式
            "%Y/%m/%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y/%m/%d %H:%M",
        ];

        for format in &formats {
            if let Ok(date) = NaiveDate::parse_from_str(date_str, format) {
                println!("成功解析日期: {} -> {}", date_str, date);
                return Ok(date);
            }
        }

        // 尝试解析纯数字格式（Excel序列号）
        if let Ok(excel_serial) = date_str.parse::<f64>() {
            let base_date = NaiveDate::from_ymd_opt(1899, 12, 30)
                .ok_or_else(|| anyhow!("无效的基准日期"))?;
            let target_date = base_date + chrono::Duration::days(excel_serial as i64);
            println!("从Excel序列号解析日期: {} -> {}", excel_serial, target_date);
            return Ok(target_date);
        }

        Err(anyhow!("无法解析日期字符串: '{}'", date_str))
    }

    fn parse_price(&self, cell: &Data) -> Result<f64> {
        match cell {
            Data::Float(f) => Ok(*f),
            Data::Int(i) => Ok(*i as f64),
            Data::String(s) => {
                let s = s.trim().replace("￥", "").replace("¥", "").replace(",", "");
                s.parse::<f64>().map_err(|_| anyhow!("无法解析价格: {}", s))
            }
            _ => Ok(0.0),
        }
    }

    fn categorycode2name(&self, code: &str) -> String {
        // 类别代码和名称的映射关系，来自原Python脚本
        let category_dict = [
            ("BLG", "双语读物"),
            ("CCM", "中文漫画"),
            ("CFI", "中文小说"),
            ("CHP", "中文低幼"),
            ("CNF", "中文科普"),
            ("CPB", "中文绘本"),
            ("CPU", "中文立体读物"),
            ("CPY", "拼音读物"),
            ("CRF", "中文家长用书"),
            ("CYX", "中文音像(书)"),
            ("ECM", "英文漫画"),
            ("EER", "英文分级读物"),
            ("EFI", "英文小说"),
            ("EHP", "英文低幼"),
            ("ENF", "英文科普"),
            ("EPB", "英文绘本"),
            ("EPU", "英文立体读物"),
            ("ERF", "英文家长用书"),
            ("EYX", "英文音像(书)"),
        ];

        for (code_key, name) in category_dict.iter() {
            if code == *code_key {
                return name.to_string();
            }
        }
        // 如果找不到对应的类别代码，返回原代码
        code.to_string()
    }

    fn get_primary_reader_name(&self, records: &[&BorrowRecord]) -> String {
        if records.is_empty() {
            return "未知读者".to_string();
        }

        let mut name_counts = std::collections::HashMap::new();
        for record in records {
            *name_counts.entry(record.reader_name.clone()).or_insert(0) += 1;
        }

        name_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(name, _)| name.clone())
            .unwrap_or_else(|| "未知读者".to_string())
    }

    pub fn analyze(&self, reader_name: &str) -> Result<AnalysisResult> {
        // 模拟Python脚本行为：单个读者文件的所有记录都属于同一个读者
        // 因此我们分析所有记录，不按姓名过滤
        let reader_records: Vec<&BorrowRecord> = self.borrow_records.iter().collect();

        if reader_records.is_empty() {
            return Err(anyhow!("没有找到任何借阅记录"));
        }

        println!("分析读者: {} - 使用文件中所有 {} 条借阅记录", reader_name, reader_records.len());

        let borrow_frequency = reader_records.len() as u32;
        let total_price: f64 = reader_records.iter().map(|r| r.price).sum();
        
        // 计算总阅读时长
        let total_reading_duration = self.calculate_total_reading_duration(&reader_records);
        
        // 分析最频繁的作者和类别
        let (most_frequent_author, most_frequent_category) = 
            self.analyze_most_frequent(&reader_records);
        
        // 分析阅读时长最长的作者和类别
        let (longest_author, longest_category) = 
            self.analyze_longest_duration(&reader_records);
        
        // 分析借阅高峰期
        let borrow_peak_yearmonth = self.analyze_borrow_peak(&reader_records);
        
        // 分析最受欢迎的书籍
        let (most_borrowed_book, most_borrowed_book_count, book_borrow_counts) = 
            self.analyze_most_borrowed_book(&reader_records);
        
        // 分析月度借阅统计
        let monthly_borrow = self.analyze_monthly_borrow(&reader_records);
        
        // 分析全勤月
        let (full_attendance, total_full_attendance) = 
            self.analyze_full_attendance(&reader_records);

        Ok(AnalysisResult {
            reader_name: reader_name.to_string(),
            borrow_frequency,
            total_reading_duration,
            total_price,
            most_frequent_author,
            most_frequent_category,
            longest_author,
            longest_category,
            borrow_peak_yearmonth,
            most_borrowed_book,
            most_borrowed_book_count,
            total_full_attendance,
            monthly_borrow,
            book_borrow_counts,
            full_attendance,
        })
    }

    fn calculate_total_reading_duration(&self, records: &[&BorrowRecord]) -> u32 {
        records.iter()
            .filter_map(|r| {
                if let Some(return_date) = r.return_date {
                    Some((return_date - r.borrow_date).num_days().max(0) as u32)
                } else {
                    // 如果没有归还日期，假设借阅了30天
                    Some(30)
                }
            })
            .sum()
    }

    fn analyze_most_frequent(&self, records: &[&BorrowRecord]) -> (String, String) {
        let mut author_counts = HashMap::new();
        let mut category_counts = HashMap::new();

        for record in records {
            *author_counts.entry(&record.author).or_insert(0) += 1;
            *category_counts.entry(&record.category).or_insert(0) += 1;
        }

        let most_frequent_author = author_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(author, _)| author.to_string())
            .unwrap_or_else(|| "未知".to_string());

        let most_frequent_category = category_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(category, _)| category.to_string())
            .unwrap_or_else(|| "未知".to_string());

        (most_frequent_author, most_frequent_category)
    }

    fn analyze_longest_duration(&self, records: &[&BorrowRecord]) -> (String, String) {
        let mut author_durations = HashMap::new();
        let mut category_durations = HashMap::new();

        for record in records {
            let duration = if let Some(return_date) = record.return_date {
                (return_date - record.borrow_date).num_days().max(0) as u32
            } else {
                30
            };

            *author_durations.entry(&record.author).or_insert(0) += duration;
            *category_durations.entry(&record.category).or_insert(0) += duration;
        }

        let longest_author = author_durations
            .iter()
            .max_by_key(|(_, &duration)| duration)
            .map(|(author, _)| author.to_string())
            .unwrap_or_else(|| "未知".to_string());

        let longest_category = category_durations
            .iter()
            .max_by_key(|(_, &duration)| duration)
            .map(|(category, _)| category.to_string())
            .unwrap_or_else(|| "未知".to_string());

        (longest_author, longest_category)
    }

    fn analyze_borrow_peak(&self, records: &[&BorrowRecord]) -> String {
        let mut month_counts = HashMap::new();

        for record in records {
            let year_month = format!("{}-{:02}", record.borrow_date.year(), record.borrow_date.month());
            *month_counts.entry(year_month).or_insert(0) += 1;
        }

        month_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(month, _)| month.clone())
            .unwrap_or_else(|| "未知".to_string())
    }

    fn analyze_most_borrowed_book(&self, records: &[&BorrowRecord]) -> (String, u32, HashMap<String, u32>) {
        let mut book_counts = HashMap::new();

        for record in records {
            *book_counts.entry(&record.book_title).or_insert(0) += 1;
        }

        let (most_borrowed_book, most_borrowed_book_count) = book_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(book, &count)| (book.to_string(), count))
            .unwrap_or_else(|| ("未知".to_string(), 0));

        let book_borrow_counts = book_counts
            .iter()
            .map(|(book, &count)| (book.to_string(), count))
            .collect();

        (most_borrowed_book, most_borrowed_book_count, book_borrow_counts)
    }

    fn analyze_monthly_borrow(&self, records: &[&BorrowRecord]) -> HashMap<String, u32> {
        let mut monthly_counts = HashMap::new();

        for record in records {
            let year_month = format!("{}-{:02}", record.borrow_date.year(), record.borrow_date.month());
            *monthly_counts.entry(year_month).or_insert(0) += 1;
        }

        monthly_counts
    }

    fn analyze_full_attendance(&self, records: &[&BorrowRecord]) -> (Vec<String>, u32) {
        use chrono::Datelike;
        
        // 创建一个映射：年月 -> ISO周集合
        let mut monthly_weeks: HashMap<String, std::collections::HashSet<String>> = HashMap::new();
        let mut all_recorded_weeks: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut week_to_months: HashMap<String, std::collections::HashSet<String>> = HashMap::new();
        
        // 为每条借阅记录添加ISO周信息
        for record in records {
            let year_month = format!("{}-{:02}", record.borrow_date.year(), record.borrow_date.month());
            let iso_week = record.borrow_date.iso_week();
            let iso_week_str = format!("{}-{:02}", iso_week.year(), iso_week.week());
            
            monthly_weeks.entry(year_month.clone())
                .or_insert_with(std::collections::HashSet::new)
                .insert(iso_week_str.clone());
            
            all_recorded_weeks.insert(iso_week_str.clone());
        }
        
        // 建立周到月份的映射关系（用于跨月周处理）
        for year_month in monthly_weeks.keys() {
            let parts: Vec<&str> = year_month.split('-').collect();
            if parts.len() == 2 {
                if let (Ok(year), Ok(month)) = (parts[0].parse::<i32>(), parts[1].parse::<u32>()) {
                    let (_, all_weeks_in_month) = self.calculate_actual_weeks(year, month);
                    for week in all_weeks_in_month {
                        week_to_months.entry(week).or_insert_with(std::collections::HashSet::new).insert(year_month.clone());
                    }
                }
            }
        }
        
        // 计算每个月的全勤情况
        let mut full_attendance_months = Vec::new();
        
        for (year_month, recorded_weeks) in &monthly_weeks {
            let parts: Vec<&str> = year_month.split('-').collect();
            if parts.len() == 2 {
                if let (Ok(year), Ok(month)) = (parts[0].parse::<i32>(), parts[1].parse::<u32>()) {
                    let (actual_weeks_count, all_weeks_in_month) = self.calculate_actual_weeks(year, month);
                    
                    // 创建修正后的记录集合（实现跨月周处理）
                    let mut corrected_recorded_weeks = recorded_weeks.clone();
                    
                    // 对于该月的每一周，如果当月没有记录但在其他月份有记录，则视为有记录
                    for week in &all_weeks_in_month {
                        if !recorded_weeks.contains(week) && all_recorded_weeks.contains(week) {
                            corrected_recorded_weeks.insert(week.clone());
                        }
                    }
                    
                    // 如果修正后的记录周数等于该月应有的周数，则为全勤
                    if corrected_recorded_weeks.len() == actual_weeks_count {
                        full_attendance_months.push(year_month.clone());
                    }
                }
            }
        }
        
        let total_full_attendance = full_attendance_months.len() as u32;
        (full_attendance_months, total_full_attendance)
    }
    
    fn calculate_actual_weeks(&self, year: i32, month: u32) -> (usize, Vec<String>) {
        use chrono::{NaiveDate, Datelike, Duration};
        
        // 创建该月的第一天
        let first_day = NaiveDate::from_ymd_opt(year, month, 1)
            .ok_or(anyhow!("无效日期"))
            .unwrap();
        
        // 计算该月的最后一天
        let last_day = if month == 12 {
            NaiveDate::from_ymd_opt(year + 1, 1, 1)
                .unwrap()
                .pred_opt()
                .unwrap()
        } else {
            NaiveDate::from_ymd_opt(year, month + 1, 1)
                .unwrap()
                .pred_opt()
                .unwrap()
        };
        
        // 生成该月的所有日期并获取ISO周
        let mut iso_weeks = std::collections::HashSet::new();
        let mut current_date = first_day;
        
        while current_date <= last_day {
            let iso_week = current_date.iso_week();
            let iso_week_str = format!("{}-{:02}", iso_week.year(), iso_week.week());
            iso_weeks.insert(iso_week_str);
            current_date = current_date + Duration::days(1);
        }
        
        let mut weeks_vec: Vec<String> = iso_weeks.into_iter().collect();
        weeks_vec.sort();
        
        (weeks_vec.len(), weeks_vec)
    }

    pub fn get_available_readers(&self) -> Vec<String> {
        // 按照Python脚本逻辑：单个文件 = 单个读者
        // 我们返回文件中最常见的读者名称作为代表
        if self.borrow_records.is_empty() {
            return vec![];
        }

        // 统计各个姓名出现频率
        let mut name_counts = std::collections::HashMap::new();
        for record in &self.borrow_records {
            *name_counts.entry(record.reader_name.clone()).or_insert(0) += 1;
        }

        // 找到最常见的姓名作为文件代表
        let primary_reader = name_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(name, _)| name.clone())
            .unwrap_or_else(|| "未知读者".to_string());

        println!("检测到读者文件，总共 {} 条记录", self.borrow_records.len());
        println!("主要读者姓名: {} ({} 条记录)", primary_reader, name_counts.get(&primary_reader).unwrap_or(&0));
        
        // 如果有多个不同的姓名，打印出来用于调试
        if name_counts.len() > 1 {
            println!("文件中发现的所有姓名变体:");
            for (name, count) in &name_counts {
                println!("  {} - {} 条记录", name, count);
            }
        }

        vec![primary_reader]
    }

    // 获取所有读者文件信息
    pub fn get_reader_files(&self) -> Vec<ReaderFileInfo> {
        self.reader_files.clone()
    }

    // 分析指定文件的读者
    pub fn analyze_file(&self, file_path: &str) -> Result<AnalysisResult> {
        // 获取指定文件的所有记录
        let file_records: Vec<&BorrowRecord> = self.borrow_records
            .iter()
            .filter(|r| r.file_source == file_path)
            .collect();

        if file_records.is_empty() {
            return Err(anyhow!("文件 {} 中没有找到借阅记录", file_path));
        }

        // 获取该文件的主要读者姓名
        let primary_reader_name = self.get_primary_reader_name(&file_records);
        
        println!("分析文件: {} - 读者: {} - {} 条记录", file_path, primary_reader_name, file_records.len());

        let borrow_frequency = file_records.len() as u32;
        let total_price: f64 = file_records.iter().map(|r| r.price).sum();
        
        // 计算总阅读时长
        let total_reading_duration = self.calculate_total_reading_duration(&file_records);
        
        // 分析最频繁的作者和类别
        let (most_frequent_author, most_frequent_category) =
            self.analyze_most_frequent(&file_records);
        
        // 分析阅读时长最长的作者和类别
        let (longest_author, longest_category) =
            self.analyze_longest_duration(&file_records);
        
        // 分析借阅高峰期
        let borrow_peak_yearmonth = self.analyze_borrow_peak(&file_records);
        
        // 分析最受欢迎的书籍
        let (most_borrowed_book, most_borrowed_book_count, book_borrow_counts) =
            self.analyze_most_borrowed_book(&file_records);
        
        // 分析月度借阅统计
        let monthly_borrow = self.analyze_monthly_borrow(&file_records);
        
        // 分析全勤月
        let (full_attendance, total_full_attendance) =
            self.analyze_full_attendance(&file_records);

        Ok(AnalysisResult {
            reader_name: primary_reader_name,
            borrow_frequency,
            total_reading_duration,
            total_price,
            most_frequent_author,
            most_frequent_category,
            longest_author,
            longest_category,
            borrow_peak_yearmonth,
            most_borrowed_book,
            most_borrowed_book_count,
            total_full_attendance,
            monthly_borrow,
            book_borrow_counts,
            full_attendance,
        })
    }

    // 获取文件数量
    pub fn get_file_count(&self) -> usize {
        self.reader_files.len()
    }

    // 获取指定索引的文件名
    pub fn get_file_name(&self, file_index: usize) -> String {
        if let Some(file_info) = self.reader_files.get(file_index) {
            std::path::Path::new(&file_info.file_path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(&file_info.file_path)
                .to_string()
        } else {
            "未知文件".to_string()
        }
    }

    // 分析指定索引的文件
    pub fn analyze_single_file(&self, file_index: usize) -> Result<AnalysisResult> {
        if let Some(file_info) = self.reader_files.get(file_index) {
            self.analyze_file(&file_info.file_path)
        } else {
            Err(anyhow!("文件索引 {} 超出范围", file_index))
        }
    }
}