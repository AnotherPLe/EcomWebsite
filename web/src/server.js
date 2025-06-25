const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

// Cấu hình kết nối database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'phuocle11001203',
  database: 'olap_datn'
});

db.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối database:', err);
    return;
  }
  console.log('Đã kết nối thành công với database');
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API tìm kiếm sản phẩm
app.get('/api/search', (req, res) => {
  const keyword = req.query.keyword || '';
  const categoryID = req.query.categoryID;
  const subDepartment = req.query.subDepartment;
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
  const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
  const maxRating = req.query.maxRating ? parseFloat(req.query.maxRating) : null;

    //API tìm kiếm sản phẩm
  let query = `
    SELECT p.*, fce.price, c.Category
    FROM dim_product p
    LEFT JOIN (
        SELECT f1.ASIN, f1.price
        FROM fact_customer_experience f1
        INNER JOIN (
            SELECT ASIN, MAX(dateID) AS max_date
            FROM fact_customer_experience
            GROUP BY ASIN
        ) f2 ON f1.ASIN = f2.ASIN AND f1.dateID = f2.max_date
    ) fce ON p.ASIN = fce.ASIN
    LEFT JOIN dim_product_category pc ON p.ASIN = pc.ASIN
    LEFT JOIN dim_category c ON pc.CategoryID = c.CategoryID
    WHERE 1=1
  `;
  const params = [];
  
  if (keyword) {
    query += ' AND (p.Product_Name LIKE ? OR p.Description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (minRating !== null) {
    query += ' AND p.Overall_Rating >= ?';
    params.push(minRating);
  }
  if (maxRating !== null) {
    query += ' AND p.Overall_Rating <= ?';
    params.push(maxRating);
  }
  if (categoryID) {
    query += ' AND pc.CategoryID = ?';
    params.push(categoryID);
  }
  if (minPrice !== null) {
    query += ' AND fce.price >= ?';
    params.push(minPrice);
  }
  if (maxPrice !== null) {
    query += ' AND fce.price <= ?';
    params.push(maxPrice);
  }
  
  // query += ' LIMIT 50';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      res.status(500).json({ error: 'Lỗi truy vấn database' });
      return;
    }
    res.json(results);
  });
});

// API lấy danh sách danh mục
app.get('/api/categories', (req, res) => {
  db.query('SELECT CategoryID, Category FROM dim_category ORDER BY Category', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Lỗi truy vấn danh mục' });
      return;
    }
    res.json(results);
  });
});

// API lấy danh sách sub_department
app.get('/api/sub-departments', (req, res) => {
  db.query('SELECT DISTINCT Sub_Department FROM dim_product WHERE Sub_Department IS NOT NULL ORDER BY Sub_Department', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Lỗi truy vấn sub department' });
      return;
    }
    res.json(results.map(r => r.Sub_Department));
  });
});

// API chi tiết sản phẩm
app.get('/api/product/:asin', (req, res) => {
  const asin = req.params.asin;
  const query = `
    SELECT 
      p.ASIN, 
      p.Product_Name, 
      p.Image_URL, 
      p.Color, 
      p.Overall_Rating, 
      p.Review_Count, 
      p.Weight, 
      p.Volumn, 
      p.ProductSizeTier, 
      p.Description,
      p.link,
      fce.price AS customer_price,
      fce.MainRankingValue,
      fce.Delivery_time_days,
      fce.AmazonGlobal_Shipping,
      fce.Estimated_Import_Charge,
      fce.PriceGroup,
      CONCAT('https://www.amazon.com/dp/', p.ASIN) as amazon_link
    FROM dim_product p
    LEFT JOIN (
        SELECT f1.ASIN, f1.price, f1.MainRankingValue, f1.Delivery_time_days, 
               f1.AmazonGlobal_Shipping, f1.Estimated_Import_Charge, f1.PriceGroup, f1.CategoryID
        FROM fact_customer_experience f1
        INNER JOIN (
            SELECT ASIN, MAX(dateID) AS max_date
            FROM fact_customer_experience
            GROUP BY ASIN
        ) f2 ON f1.ASIN = f2.ASIN AND f1.dateID = f2.max_date
    ) fce ON p.ASIN = fce.ASIN
    WHERE p.ASIN = ?
    LIMIT 1
  `;
  db.query(query, [asin], (err, results) => {
    if (err) {
      console.error('Lỗi truy vấn:', err);
      res.status(500).json({ error: 'Lỗi truy vấn database' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      return;
    }
    res.json(results[0]);
  });
});

function getPagination(current, total) {
    let pages = [];
    if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        if (current <= 3) {
            pages = [1, 2, 3, '...', total];
        } else if (current >= total - 2) {
            pages = [1, '...', total - 2, total - 1, total];
        } else {
            pages = [1, '...', current, '...', total];
        }
    }
    return pages;
}

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
}); 