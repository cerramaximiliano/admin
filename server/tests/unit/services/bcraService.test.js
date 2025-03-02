const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const download = require('download');

// Mocks
const loggerMock = {
  info: sinon.stub(),
  error: sinon.stub(),
  warn: sinon.stub(),
  debug: sinon.stub()
};

const emailServiceMock = {
  sendEmail: sinon.stub().resolves(true)
};

const configMock = {
  tasas: {
    scraping: {
      baseUrl: {
        bcra: 'http://test-bcra.gov.ar/Pdfs/'
      }
    }
  },
  paths: {
    serverFiles: path.join(__dirname, '../../fixtures')
  },
  email: {
    defaultSender: 'test@example.com',
    supportEmail: 'support@example.com'
  }
};

// Mock para el modelo Tasas
class TasasModelMock {
  static findOne() {
    return {
      sort: () => ({
        exec: sinon.stub().resolves({
          fecha: new Date('2023-01-01'),
          tasaPasivaBCRA: 0.05,
          cer: 1.25,
          icl: 1.05
        })
      })
    };
  }
  
  static findOneAndUpdate() {
    return {
      exec: sinon.stub().resolves({
        fecha: new Date('2023-01-02'),
        tasaPasivaBCRA: 0.055
      })
    };
  }
  
  static bulkWrite() {
    return Promise.resolve({
      matchedCount: 3,
      modifiedCount: 2,
      upsertedCount: 1
    });
  }
}

describe('BCRA Service', () => {
  let bcraService;
  
  beforeEach(() => {
    // Configurar mockery
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });
    
    // Registrar mocks
    mockery.registerMock('../utils/logger', loggerMock);
    mockery.registerMock('../email/emailService', emailServiceMock);
    mockery.registerMock('../../config', configMock);
    mockery.registerMock('../../models/tasas', TasasModelMock);
    mockery.registerMock('download', sinon.stub().resolves());
    mockery.registerMock('fs', {
      writeFileSync: sinon.stub(),
      readFileSync: sinon.stub().returns(Buffer.from('test data')),
      existsSync: sinon.stub().returns(true),
      createWriteStream: sinon.stub().returns({
        on: sinon.stub().returns({
          pipe: sinon.stub()
        })
      })
    });
    
    // Importar el servicio con mocks
    bcraService = require('../../../services/scrapers/bcraService');
    
    // Reiniciar stubs
    loggerMock.info.reset();
    loggerMock.error.reset();
    emailServiceMock.sendEmail.reset();
  });
  
  afterEach(() => {
    // Desactivar mockery
    mockery.deregisterAll();
    mockery.disable();
  });
  
  describe('downloadTasaPasivaBCRA', () => {
    it('debe descargar y procesar la tasa pasiva BCRA correctamente', async () => {
      // Stub para xlsx
      sinon.stub(xlsx, 'readFile').returns({
        SheetNames: ['Serie_diaria'],
        Sheets: {
          'Serie_diaria': {}
        }
      });
      
      sinon.stub(xlsx.utils, 'sheet_to_json').returns([
        { col1: 20230101, col2: 0.055 }
      ]);
      
      // Ejecutar función
      const result = await bcraService.downloadTasaPasivaBCRA();
      
      // Verificar resultado
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(loggerMock.info.called).to.be.true;
      expect(loggerMock.error.called).to.be.false;
      
      // Restaurar stubs
      xlsx.readFile.restore();
      xlsx.utils.sheet_to_json.restore();
    });
    
    it('debe manejar errores correctamente', async () => {
      // Forzar error
      sinon.stub(download, 'default').rejects(new Error('Error de descarga'));
      
      // Ejecutar función
      const result = await bcraService.downloadTasaPasivaBCRA();
      
      // Verificar resultado
      expect(result).to.be.an('object');
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Error de descarga');
      expect(loggerMock.error.called).to.be.true;
      
      // Restaurar stubs
      download.default.restore();
    });
  });
  
  describe('downloadCER', () => {
    it('debe descargar y procesar el CER correctamente', async () => {
      // Stub para xlsx
      sinon.stub(xlsx, 'readFile').returns({
        SheetNames: ['Totales_diarios'],
        Sheets: {
          'Totales_diarios': {}
        }
      });
      
      sinon.stub(xlsx.utils, 'sheet_to_json').returns([
        { col1: 20230102, col2: 1.256789012345 }
      ]);
      
      // Ejecutar función
      const result = await bcraService.downloadCER();
      
      // Verificar resultado
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(loggerMock.info.called).to.be.true;
      
      // Restaurar stubs
      xlsx.readFile.restore();
      xlsx.utils.sheet_to_json.restore();
    });
  });
  
  describe('downloadICL', () => {
    it('debe descargar y procesar el ICL correctamente', async () => {
      // Stub para xlsx
      sinon.stub(xlsx, 'readFile').returns({
        SheetNames: ['ICL'],
        Sheets: {
          'ICL': {}
        }
      });
      
      sinon.stub(xlsx.utils, 'sheet_to_json').returns([
        { 
          col1: 20230103, 
          'INTEREST RATES AND ADJUSTMENT COEFFICIENTS ESTABLISHED BY THE BCRA': 1.067891234
        }
      ]);
      
      // Ejecutar función
      const result = await bcraService.downloadICL();
      
      // Verificar resultado
      expect(result).to.be.an('object');
      expect(result.success).to.be.true;
      expect(loggerMock.info.called).to.be.true;
      
      // Restaurar stubs
      xlsx.readFile.restore();
      xlsx.utils.sheet_to_json.restore();
    });
  });
});