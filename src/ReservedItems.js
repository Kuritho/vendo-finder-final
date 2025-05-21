import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import './ReservedItems.css';


class ReservedItems extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            reservedItems: [],
            loading: true,
            error: null,
            vendoName: "",
            showReceipt: false,
            transactionCode: null,
            purchaseTime: null,
            products: [],
            isMobile: window.innerWidth < 768
        };
    }

    componentDidMount() {
        const vendoId = this.props.params.vendoId;
        this.loadReservedItems(vendoId);
        this.fetchVendoName(vendoId);
        this.fetchProducts(vendoId);
        
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    handleResize() {
        this.setState({ isMobile: window.innerWidth < 768 });
    }

    loadReservedItems = (vendoId) => {
        try {
            const savedItems = JSON.parse(localStorage.getItem(`reservedItems_${vendoId}`)) || [];
            const itemsWithQuantity = savedItems.map(item => ({
                ...item,
                quantity: item.quantity || 1
            }));
            this.setState({
                reservedItems: itemsWithQuantity,
                loading: false
            });
        } catch (error) {
            this.setState({
                error: "Failed to load reserved items",
                loading: false
            });
        }
    }

    fetchVendoName = async (vendoId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/Vendo/GetVendo/${vendoId}`);
            if (!response.ok) throw new Error('Failed to fetch vendo');
            
            const data = await response.json();
            if (data.success) {
                this.setState({ vendoName: data.data.name });
            }
        } catch (error) {
            console.error("Error fetching vendo name:", error);
        }
    }

    fetchProducts = async (vendoId) => {
        try {
            const savedItems = JSON.parse(localStorage.getItem(`reservedItems_${vendoId}`)) || [];
            if (savedItems.length === 0) return;

            const productFetchPromises = savedItems.map(async (item) => {
                try {
                    let endpoint;
                    if (vendoId === '4') {
                        endpoint = `${process.env.REACT_APP_API_BASE_URL}/api/ProductVariant/${item.productId}`;
                    } else if (vendoId === '5') {
                        endpoint = `${process.env.REACT_APP_API_BASE_URL}/api/ProductVariant/${item.productId}`;
                    } else {
                        throw new Error('Unknown vendo ID');
                    }
                    
                    const response = await fetch(endpoint);
                    if (!response.ok) throw new Error(`Failed to fetch product variant ${item.productId}`);
                    
                    const data = await response.json();
                    return {
                        success: true,
                        productId: item.productId,
                        data: data.data || data,
                        imageUrl: item.imageUrl || this.getProductImageUrl(item.productId)
                    };
                } catch (error) {
                    console.error(`Error fetching product ${item.productId}:`, error);
                    return { 
                        success: false,
                        productId: item.productId,
                        error: error.message 
                    };
                }
            });

            const productResponses = await Promise.all(productFetchPromises);
            
            this.setState({
                products: productResponses
                    .filter(response => response.success)
                    .map(response => ({
                        productId: response.productId,
                        data: response.data,
                        imageUrl: response.imageUrl
                    }))
            });

        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }

    getProductImageUrl = (productId) => {
        const productImages = {
            58: "/assets/images/pampers-small.png",
            59: "/assets/images/pampers-medium.png",
            60: "/assets/images/pampers-large.png",
            61: "/assets/images/wipes.png",
            62: "/assets/images/tissue.jpg",
            68: "/assets/images/pampers-small.png",
            69: "/assets/images/pampers-medium.png",
            70: "/assets/images/pampers-large.png",
            71: "/assets/images/wipes.png",
            72: "/assets/images/tissue.jpg",
        };
        return productImages[productId] || "/assets/images/default-product.png";
    }

    updateQuantity = (index, newQuantity) => {
        const vendoId = this.props.params.vendoId;
        newQuantity = Math.max(1, newQuantity);
        
        this.setState(prevState => {
            const updatedItems = [...prevState.reservedItems];
            updatedItems[index] = {
                ...updatedItems[index],
                quantity: newQuantity
            };
            
            localStorage.setItem(`reservedItems_${vendoId}`, JSON.stringify(updatedItems));
            
            return {
                reservedItems: updatedItems
            };
        });
    }

    removeItem = (index) => {
        const vendoId = this.props.params.vendoId;
        this.setState(prevState => {
            const updatedItems = [...prevState.reservedItems];
            const removedItem = updatedItems.splice(index, 1)[0];
            
            localStorage.setItem(`reservedItems_${vendoId}`, JSON.stringify(updatedItems));
            
            const updatedProducts = prevState.products.filter(
                product => product.productId !== removedItem.productId
            );
            
            return {
                reservedItems: updatedItems,
                products: updatedProducts
            };
        });
    }

    confirmPurchase = async () => {
        const { reservedItems } = this.state;
        const vendoId = this.props.params.vendoId;
        
        if (reservedItems.length === 0) {
            alert("No items to purchase");
            return;
        }

        try {
            const orderItems = reservedItems.map(item => ({
                productVariantId: item.productId,
                quantity: item.quantity,
                price: parseFloat(item.price)
            }));

            const response = await fetch('${process.env.REACT_APP_API_BASE_URL}/api/Order/CreateOrder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderItems)
            });

            if (!response.ok) {
                throw new Error(`Failed to create order: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || "Failed to create order");
            }

            const transactionCode = result.data.code;
            const purchaseTime = new Date(result.data.orderDate).toLocaleString();
            const totalAmount = result.data.totalAmount;

            this.setState({
                showReceipt: true,
                transactionCode,
                purchaseTime,
                totalAmount
            });

            localStorage.removeItem(`reservedItems_${vendoId}`);
            this.setState({ 
                reservedItems: [],
                products: [] 
            });

        } catch (error) {
            console.error("Purchase error:", error);
            alert(`Failed to confirm purchase: ${error.message}`);
        }
    }

    closeReceipt = () => {
        const vendoId = this.props.params.vendoId;
        this.setState({ showReceipt: false });
        this.props.navigate(`/vendo/${vendoId}`);
    }

    downloadReceipt = () => {
        const receiptElement = document.getElementById('receipt-container');
        
        html2canvas(receiptElement).then(canvas => {
            const link = document.createElement('a');
            link.download = `receipt-${this.state.transactionCode}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    getEnhancedReservedItems = () => {
        const { reservedItems, products } = this.state;
        return reservedItems.map(item => {
            const productData = products.find(p => p.productId === item.productId) || {};
            return {
                ...item,
                imageUrl: productData.imageUrl || this.getProductImageUrl(item.productId),
                description: productData.data?.description || "No description available",
                totalPrice: (parseFloat(item.price) * item.quantity).toFixed(2)
            };
        });
    }

    renderMobileItem = (item, index) => {
        return (
            <div key={index} style={styles.mobileItem}>
                <div style={styles.mobileItemHeader}>
                    <img 
                        src={item.imageUrl} 
                        alt={item.productName} 
                        style={styles.mobileItemImage}
                    />
                    <div style={styles.mobileItemInfo}>
                        <h4 style={styles.mobileItemName}>{item.productName}</h4>
                        <p style={styles.mobileItemPrice}>₱{parseFloat(item.price).toFixed(2)}</p>
                    </div>
                </div>
                
                <div style={styles.mobileItemDetails}>
                    <p style={styles.mobileItemDescription}>{item.description}</p>
                    
                    <div style={styles.mobileItemActions}>
                        <div style={styles.quantityContainer}>
                            <button 
                                style={styles.quantityButton}
                                onClick={() => this.updateQuantity(index, item.quantity - 1)}
                            >
                                -
                            </button>
                            <span style={styles.quantityValue}>{item.quantity}</span>
                            <button 
                                style={styles.quantityButton}
                                onClick={() => this.updateQuantity(index, item.quantity + 1)}
                            >
                                +
                            </button>
                        </div>
                        
                        <button 
                            style={styles.removeButton}
                            onClick={() => this.removeItem(index)}
                        >
                            Remove
                        </button>
                    </div>
                    
                    <div style={styles.mobileItemTotal}>
                        <span>Total:</span>
                        <span>₱{item.totalPrice}</span>
                    </div>
                </div>
            </div>
        );
    }

    renderReceipt = () => {
        const { vendoName, transactionCode, purchaseTime, isMobile } = this.state;
        const enhancedReservedItems = this.getEnhancedReservedItems();
        const totalAmount = enhancedReservedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0).toFixed(2);

        return (
            <div id="receipt-container" style={isMobile ? styles.mobileReceiptContainer : styles.receiptContainer}>
                <h2 style={styles.receiptTitle}>Receipt</h2>
                <div style={styles.receiptContent}>
                    <p style={styles.receiptText}>This Receipt can only be claimed at Vendo: {vendoName}</p>
                    <p style={styles.receiptText}>Please save this Code:</p>
                    <p style={styles.receiptCode}>{transactionCode}</p>
                    <p style={styles.receiptDivider}>------------------------------------------</p>
                    <p style={styles.receiptText}>Note: Do not forget to Download the Receipt</p>
                    <p style={styles.receiptDivider}>------------------------------------------</p>
                    <p style={styles.receiptText}>Date: {purchaseTime}</p>
                    
                    <div style={styles.receiptItems}>
                        {enhancedReservedItems.map((item, index) => (
                            <div key={index} style={styles.receiptItem}>
                                <div style={styles.receiptItemInfo}>
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.productName} 
                                        style={styles.receiptItemImage}
                                    />
                                    <span>{item.productName} (x{item.quantity})</span>
                                </div>
                                <span>₱{item.totalPrice}</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* <div style={styles.receiptTotal}>
                        <span>Total:</span>
                        <span>₱{totalAmount}</span>
                    </div> */}
                </div>
                
                <div style={styles.receiptButtons}>
                    <button 
                        style={styles.receiptCloseButton}
                        onClick={this.closeReceipt}
                    >
                        Close
                    </button>
                    <button 
                        style={styles.receiptDownloadButton}
                        onClick={this.downloadReceipt}
                    >
                        Download Receipt
                    </button>
                </div>
            </div>
        );
    }

    render() {
        const { loading, error, vendoName, showReceipt, isMobile } = this.state;
        const vendoId = this.props.params.vendoId;
        const enhancedReservedItems = this.getEnhancedReservedItems();
        const totalAmount = enhancedReservedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0).toFixed(2);
        const totalItems = enhancedReservedItems.reduce((sum, item) => sum + item.quantity, 0);

        if (loading) {
            return <div style={styles.loading}>Loading reserved items...</div>;
        }

        if (error) {
            return (
                <div style={styles.errorContainer}>
                    <div style={styles.error}>{error}</div>
                    <button 
                        style={styles.backButton} 
                        onClick={() => this.props.navigate(`/vendo/${vendoId}`)}
                    >
                        Back to Vendo
                    </button>
                </div>
            );
        }

        return (
            <div style={styles.container}>
                <h1 style={styles.heading}>Reserved Items - {vendoName}</h1>
                
                <div style={styles.buttonGroup}>
                    <button 
                        style={styles.backButton}
                        onClick={() => this.props.navigate(`/vendo/${vendoId}`)}
                    >
                        Back to Vendo
                    </button>
                    <button 
                        style={styles.confirmButton}
                        onClick={this.confirmPurchase}
                        disabled={enhancedReservedItems.length === 0}
                    >
                        Confirm Purchase
                    </button>
                </div>

                {enhancedReservedItems.length === 0 ? (
                    <p style={styles.noItems}>No items reserved yet</p>
                ) : isMobile ? (
                    <div style={styles.mobileItemsContainer}>
                        {enhancedReservedItems.map((item, index) => this.renderMobileItem(item, index))}
                        <div style={styles.mobileTotalContainer}>
                            <h3 style={styles.totalText}>
                                Total: ₱{totalAmount} ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                            </h3>
                        </div>
                    </div>
                ) : (
                    <div style={styles.itemsContainer}>
                        <table style={styles.itemsTable}>
                            <thead>
                                <tr>
                                    <th style={styles.tableHeader}>Product ID</th>
                                    <th style={styles.tableHeader}>Product</th>
                                    <th style={styles.tableHeader}>Image</th>
                                    <th style={styles.tableHeader}>Price</th>
                                    <th style={styles.tableHeader}>Quantity</th>
                                    <th style={styles.tableHeader}>Total</th>
                                    <th style={styles.tableHeader}>Description</th>
                                    <th style={styles.tableHeader}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enhancedReservedItems.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.tableCell}>{item.productId}</td>
                                        <td style={styles.tableCell}>{item.productName}</td>
                                        <td style={styles.tableCell}>
                                            <img 
                                                src={item.imageUrl} 
                                                alt={item.productName} 
                                                style={styles.productImage}
                                            />
                                        </td>
                                        <td style={styles.tableCell}>₱{parseFloat(item.price).toFixed(2)}</td>
                                        <td style={styles.tableCell}>
                                            <div style={styles.quantityContainer}>
                                                <button 
                                                    style={styles.quantityButton}
                                                    onClick={() => this.updateQuantity(index, item.quantity - 1)}
                                                >
                                                    -
                                                </button>
                                                <span style={styles.quantityValue}>{item.quantity}</span>
                                                <button 
                                                    style={styles.quantityButton}
                                                    onClick={() => this.updateQuantity(index, item.quantity + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td style={styles.tableCell}>₱{item.totalPrice}</td>
                                        <td style={styles.tableCell}>{item.description}</td>
                                        <td style={styles.tableCell}>
                                            <button 
                                                style={styles.removeButton}
                                                onClick={() => this.removeItem(index)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={styles.totalContainer}>
                            <h3 style={styles.totalText}>
                                Total: ₱{totalAmount} ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                            </h3>
                        </div>
                    </div>
                )}

                {showReceipt && (
                    <div style={styles.receiptOverlay}>
                        {this.renderReceipt()}
                    </div>
                )}
            </div>
        );
    }
}

export default function(props) {
    const params = useParams();
    const navigate = useNavigate();
    return <ReservedItems {...props} params={params} navigate={navigate} />;
}

const styles = {
    container: {
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#F7F7F7',
        padding: '20px',
        minHeight: '100vh',
        position: 'relative'
    },
    heading: {
        color: '#4A4E69',
        marginBottom: '20px',
        fontSize: '24px'
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    },
    backButton: {
        backgroundColor: '#9A8C98',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#8A7C88'
        }
    },
    confirmButton: {
        backgroundColor: '#4A4E69',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#3A3E59'
        },
        ':disabled': {
            backgroundColor: '#cccccc',
            cursor: 'not-allowed'
        }
    },
    // Desktop styles
    itemsContainer: {
        margin: '20px auto',
        maxWidth: '1000px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        overflowX: 'auto'
    },
    itemsTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '20px'
    },
    tableHeader: {
        backgroundColor: '#4A4E69',
        color: 'white',
        padding: '12px',
        textAlign: 'left'
    },
    tableCell: {
        padding: '12px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left',
        verticalAlign: 'middle'
    },
    productImage: {
        width: '50px',
        height: '50px',
        objectFit: 'cover'
    },
    quantityContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    quantityButton: {
        backgroundColor: '#4A4E69',
        color: 'white',
        border: 'none',
        width: '30px',
        height: '30px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#3A3E59'
        }
    },
    quantityValue: {
        minWidth: '20px',
        textAlign: 'center'
    },
    removeButton: {
        backgroundColor: '#D32F2F',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        cursor: 'pointer',
        borderRadius: '4px',
        fontSize: '14px',
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#B71C1C'
        }
    },
    totalContainer: {
        textAlign: 'right',
        marginTop: '20px',
        paddingRight: '20px'
    },
    totalText: {
        color: '#4A4E69',
        fontSize: '18px'
    },
    noItems: {
        color: '#4A4E69',
        fontSize: '16px',
        margin: '40px 0'
    },
    loading: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '20px',
        color: '#4A4E69'
    },
    errorContainer: {
        textAlign: 'center',
        padding: '40px'
    },
    error: {
        color: '#D32F2F',
        marginBottom: '30px',
        fontSize: '18px'
    },
    receiptOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    receiptContainer: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
    },
    mobileReceiptContainer: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
    },
    receiptTitle: {
        color: '#4A4E69',
        textAlign: 'center',
        marginBottom: '20px',
        borderBottom: '2px solid #4A4E69',
        paddingBottom: '10px',
        fontSize: '22px'
    },
    receiptContent: {
        marginBottom: '20px'
    },
    receiptText: {
        margin: '10px 0',
        color: '#333',
        fontSize: '14px'
    },
    receiptCode: {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        margin: '15px 0',
        color: '#4A4E69'
    },
    receiptDivider: {
        color: '#999',
        textAlign: 'center',
        margin: '15px 0',
        fontSize: '14px'
    },
    receiptItems: {
        margin: '20px 0',
        borderTop: '1px dashed #ccc',
        borderBottom: '1px dashed #ccc',
        padding: '10px 0'
    },
    receiptItem: {
        display: 'flex',
        justifyContent: 'space-between',
        margin: '8px 0',
        alignItems: 'center',
        fontSize: '14px'
    },
    receiptItemInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    receiptItemImage: {
        width: '30px',
        height: '30px',
        objectFit: 'cover'
    },
    receiptTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
        fontWeight: 'bold',
        fontSize: '16px'
    },
    receiptButtons: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        marginTop: '20px'
    },
    receiptCloseButton: {
        backgroundColor: '#9A8C98',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        flex: 1,
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#8A7C88'
        }
    },
    receiptDownloadButton: {
        backgroundColor: '#4A4E69',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        borderRadius: '5px',
        fontSize: '16px',
        flex: 1,
        transition: 'background-color 0.3s',
        ':hover': {
            backgroundColor: '#3A3E59'
        }
    },
    // Mobile-specific styles
    mobileItemsContainer: {
        margin: '20px auto',
        maxWidth: '600px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    mobileItem: {
        borderBottom: '1px solid #eee',
        padding: '15px 0',
        ':lastchild': {
            borderBottom: 'none'
        }
    },
    mobileItemHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '10px'
    },
    mobileItemImage: {
        width: '60px',
        height: '60px',
        objectFit: 'cover',
        borderRadius: '5px'
    },
    mobileItemInfo: {
        flex: 1,
        textAlign: 'left'
    },
    mobileItemName: {
        margin: '0 0 5px 0',
        color: '#4A4E69',
        fontSize: '16px'
    },
    mobileItemPrice: {
        margin: 0,
        color: '#666',
        fontSize: '14px'
    },
    mobileItemDetails: {
        paddingLeft: '75px' // image width + gap
    },
    mobileItemDescription: {
        color: '#666',
        fontSize: '14px',
        margin: '0 0 10px 0'
    },
    mobileItemActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    mobileItemTotal: {
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        color: '#4A4E69',
        fontSize: '16px'
    },
    mobileTotalContainer: {
        textAlign: 'right',
        marginTop: '15px',
        paddingRight: '10px'
    }
};