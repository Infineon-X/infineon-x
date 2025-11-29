/******************************************************************************
* File Name:   main.c
*
* Description: This is the main file for mtb-example-ml-deepcraft-deploy-radar
* Code Example.
*
* Related Document: See README.md
*
*******************************************************************************
* Copyright 2024-2025, Cypress Semiconductor Corporation (an Infineon company) or
* an affiliate of Cypress Semiconductor Corporation.  All rights reserved.
*
* This software, including source code, documentation and related
* materials ("Software") is owned by Cypress Semiconductor Corporation
* or one of its affiliates ("Cypress") and is protected by and subject to
* worldwide patent protection (United States and foreign),
* United States copyright laws and international treaty provisions.
* Therefore, you may use this Software only as provided in the license
* agreement accompanying the software package from which you
* obtained this Software ("EULA").
* If no EULA applies, Cypress hereby grants you a personal, non-exclusive,
* non-transferable license to copy, modify, and compile the Software
* source code solely for use in connection with Cypress's
* integrated circuit products.  Any reproduction, modification, translation,
* compilation, or representation of this Software except as specified
* above is prohibited without the express written permission of Cypress.
*
* Disclaimer: THIS SOFTWARE IS PROVIDED AS-IS, WITH NO WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, NONINFRINGEMENT, IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. Cypress
* reserves the right to make changes to the Software without notice. Cypress
* does not assume any liability arising out of the application or use of the
* Software or any product or circuit described in the Software. Cypress does
* not authorize its products for use in any products where a malfunction or
* failure of the Cypress product may reasonably be expected to result in
* significant property damage, injury or death ("High Risk Product"). By
* including Cypress's product in a High Risk Product, the manufacturer
* of such system or application assumes all risk of such use and in doing
* so agrees to indemnify Cypress against all liability.
*******************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <float.h>
#include "cyhal.h"
#include "cybsp.h"
#include "cy_retarget_io.h"
#include "xensiv_bgt60trxx_mtb.h"
#include "xensiv_bgt60trxx_platform.h"
#include "radar_settings.h"
#include "cy_scb_spi.h"
/* Model to use */
#include "models/model.h"

/*******************************************************************************
* Macros
********************************************************************************/
/* These sizes and masks must be aligned. */
#define DEFAULT_FIFO_SETTING 6144
#define RING_BUFFER_SIZE 0x00010000 /* 64k samples */
#define RING_BUFFER_MASK 0x0000FFFF
#define RING_BUFFER_MASK32 0x00007FFF /* Mask for 32-bits */
#define XENSIV_BGT60TRXX_SPI_BURST_MODE_CMD             (0xFF000000UL)  /* Write addr 7f<<1 | 0x01 */
#define XENSIV_BGT60TRXX_SPI_BURST_MODE_SADR_POS        (17U)
#define XENSIV_BGT60TRXX_SPI_BURST_MODE_RWB_POS         (16U)
#define XENSIV_BGT60TRXX_SPI_BURST_MODE_LEN_POS         (9U)
#define PUSH_CLASS_INDEX 2
#define PUSH_SCORE_THRESHOLD 0.85f
#define LED_PULSE_MS 200U
#define LED_COOLDOWN_MS 2000U
#define LED_TIMER_HZ 1000000U /* 1 MHz clock gives 1 ms ticks with period 999 */

/*******************************************************************************
* Ringbuffer array
*******************************************************************************/
uint16_t bgt60_tensor_ring[ RING_BUFFER_SIZE ];  /* This is the size of the internal fifo. */
uint32_t* ring32;
int bgt60_ring_next_to_write = 0;
int bgt60_ring_next_to_read = 0;
int bgt60_ring_level=0;

/*******************************************************************************
* Preset configuration variables and structs.
*******************************************************************************/
struct xensiv_bgt60trxx_type
{
    uint32_t fifo_addr;
    uint16_t fifo_size;
    xensiv_bgt60trxx_device_t device;
};

struct radar_config radar_configs;

/*******************************************************************************
* Types
*******************************************************************************/

typedef struct {
    xensiv_bgt60trxx_mtb_t bgt60_obj;
    uint16_t bgt60_buffer0[16384];
    uint16_t bgt60_buffer1[16384];
    float bgt60_send_buffer[RING_BUFFER_SIZE];
    bool have_data;
    int skipped_frames;
} dev_bgt60trxx_t;

enum spi_state {
    NONE = 0,
    IDLE,
    BURST_PENDING,
    FIFO_READ_PENDING,
    FIFO_READ_DONE
};

enum spi_state sp_state = IDLE;

/*******************************************************************************
* LED pulse state
*******************************************************************************/
typedef enum {
    LED_IDLE = 0,
    LED_PULSE_ACTIVE,
    LED_COOLDOWN
} led_state_t;

static cyhal_timer_t led_timer;
static volatile uint32_t led_pulse_remaining_ms = 0;
static volatile uint32_t led_cooldown_remaining_ms = 0;
static volatile led_state_t led_state = LED_IDLE;

/*******************************************************************************
* Function Prototypes
********************************************************************************/
static bool radar_init(dev_bgt60trxx_t *radar, cyhal_spi_t* spi);
static void load_presets(void);
static void spi_set_data_width(CySCB_Type* base, uint32_t data_width);
bool board_set_clocks(void);
static void led_timer_handler(void *callback_arg, cyhal_timer_event_t event);

/*******************************************************************************
* Function Name: main
********************************************************************************
* Summary:
* This is the main function for CM4 CPU. It initializes BSP, radar, SPI and the
* ML model. It reads data from radar sensor continuously, processes it within
* the model and displays the output.
*
* Parameters:
*  void
*
* Return:
*  int
*
*******************************************************************************/
int main(void)
{
    const char* class_map[] = IMAI_DATA_OUT_SYMBOLS;

    cy_rslt_t result;
    static cyhal_spi_t spi;
    static dev_bgt60trxx_t radar;

    /* Initialize the device and board peripherals */
    result = cybsp_init() ;
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    /* Enable global interrupts */
    __enable_irq();

    board_set_clocks();

    /* Initialize retarget-io to use the debug UART port */
    cy_retarget_io_init(CYBSP_DEBUG_UART_TX, CYBSP_DEBUG_UART_RX, CY_RETARGET_IO_BAUDRATE);

    /* \x1b[2J\x1b[;H - ANSI ESC sequence for clear screen */
    printf("\x1b[2J\x1b[;H");

    result = cyhal_gpio_init(CYBSP_USER_LED, CYHAL_GPIO_DIR_OUTPUT,
                             CYHAL_GPIO_DRIVE_STRONG, CYBSP_LED_STATE_OFF);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    cyhal_timer_cfg_t led_timer_cfg =
    {
        .compare_value = 0,
        .period = 999, /* 1 ms tick with 1 MHz clock */
        .direction = CYHAL_TIMER_DIR_UP,
        .is_compare = false,
        .is_continuous = true,
        .value = 0
    };

    result = cyhal_timer_init(&led_timer, NC, NULL);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    result = cyhal_timer_configure(&led_timer, &led_timer_cfg);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    result = cyhal_timer_set_frequency(&led_timer, LED_TIMER_HZ);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    cyhal_timer_register_callback(&led_timer, led_timer_handler, NULL);
    cyhal_timer_enable_event(&led_timer, CYHAL_TIMER_IRQ_TERMINAL_COUNT, 3, true);

    result = cyhal_timer_start(&led_timer);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    result = cyhal_spi_init(
            &spi,
            CYBSP_RSPI_MOSI,
            CYBSP_RSPI_MISO,
            CYBSP_RSPI_CLK,
            NC,
            NULL,
            8,
            CYHAL_SPI_MODE_00_MSB,
            false);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    result = cyhal_spi_set_frequency(&spi, 18750000UL);
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    load_presets();

    radar_init(&radar, &spi);

    if (xensiv_bgt60trxx_soft_reset(&radar.bgt60_obj.dev, XENSIV_BGT60TRXX_RESET_FIFO) != XENSIV_BGT60TRXX_STATUS_OK)
    {
        printf("Fifo reset error error.\r\n");
    }
    /* Reset the local fifo. */
    bgt60_ring_next_to_write = 0;
    bgt60_ring_next_to_read = 0;
    bgt60_ring_level=0;

    radar.have_data = false;
    if (xensiv_bgt60trxx_start_frame(&radar.bgt60_obj.dev, true) != XENSIV_BGT60TRXX_STATUS_OK)
    {
        printf("Start frame error.\r\n");
    }

    /* Init DEEPCRAFT AI model */
    IMAI_init();
    /* ANSI ESC sequence for clear screen */
    printf("\x1b[2J\x1b[;H\x1b[?25l;");
    for(;;)
    {
        int a;
        int words_a_24;
        int fifo_size_32;
        int imai_result_enqueue;
        static int frames=0;
        float model_out[IMAI_DATA_OUT_COUNT];

        xensiv_bgt60trxx_t* p_device = &radar.bgt60_obj.dev;

        void* iface = p_device->iface;
        xensiv_bgt60trxx_mtb_iface_t* mtb_iface = iface;

        /* Check if SPI transfer is active. If it is active then skip everything. */
        if (0UL != (CY_SCB_SPI_TRANSFER_ACTIVE &
                    Cy_SCB_SPI_GetTransferStatus(mtb_iface->spi->base, &(mtb_iface->spi->context))))
        {
            continue;
        }

        switch (sp_state)
        {
            case IDLE:
                a = cyhal_gpio_read(CYBSP_RSPI_IRQ); /* P11_0 */
                if ( a )
                {
                    /* Make Chip select */
                    xensiv_bgt60trxx_platform_spi_cs_set(iface, false);

                    /* Read current fifo state */
                    uint32_t* head = (uint32_t*)radar.bgt60_buffer0;
                    const xensiv_bgt60trxx_mtb_iface_t* mtb_iface = iface;

                    *head = XENSIV_BGT60TRXX_SPI_BURST_MODE_CMD |
                            (p_device->type->fifo_addr << XENSIV_BGT60TRXX_SPI_BURST_MODE_SADR_POS) |   /* Addr 0x60.. */
                            (0 << XENSIV_BGT60TRXX_SPI_BURST_MODE_RWB_POS) |    /* Read mode */
                            (0 << XENSIV_BGT60TRXX_SPI_BURST_MODE_LEN_POS);     /* Read until termination. */

                    /* Ensure correct byte order for sending the command */
                    *head = xensiv_bgt60trxx_platform_word_reverse(*head);

                    spi_set_data_width(mtb_iface->spi->base, 8U);
                    Cy_SCB_SetByteMode(mtb_iface->spi->base, true);

                    Cy_SCB_SPI_Transfer(mtb_iface->spi->base, (uint8_t*)radar.bgt60_buffer0,
                                                                      (uint8_t*)radar.bgt60_buffer1, /* Can be set to NULL, Recieved data is discarded. */
                                                                      4,
                                                                      &(mtb_iface->spi->context));

                    sp_state = BURST_PENDING;
                }
                break;

            case BURST_PENDING:

                words_a_24 = radar_configs.fifo_int_level & 0xFFFFFFC0;

                spi_set_data_width(mtb_iface->spi->base, 12U);

                Cy_SCB_SetByteMode(mtb_iface->spi->base, false);


                Cy_SCB_SPI_Transfer(mtb_iface->spi->base,
                                                (uint8_t*)radar.bgt60_buffer0, /* Can be set to NULL, Recieved data is discarded. */
                                                (uint8_t*)radar.bgt60_buffer1,
                                                words_a_24,
                                                &(mtb_iface->spi->context));

            /* At this point it might be a good idea to check if there is another interrupt from the radar pending. */
            /* If there is it should be possible to swap buffers and issue a second read of data. */
            /* In this state the radar burst mode is still active. */
                sp_state = FIFO_READ_PENDING;
                break;

            case FIFO_READ_PENDING:
                /* Clear the Chip Select. Done when the next polling allows for it. */
                xensiv_bgt60trxx_platform_spi_cs_set(iface, true);
                sp_state = FIFO_READ_DONE;
                break;

            case FIFO_READ_DONE:
                sp_state = IDLE;
                break;

            default:
                break;
        }

        if(sp_state == FIFO_READ_DONE)
        {
            radar.have_data = false;

    /*********************************************************************************
    **  Data copying is now made as a 32-bit data copying to reduce the number of
    **  clock cycles needed.
    */
            ring32 = (uint32_t*)bgt60_tensor_ring; /* This will point to a 32k buffer. */
            fifo_size_32 = radar_configs.fifo_int_level>>1;

            for ( int x = 0; x<fifo_size_32; x++ )
            {
                ring32[bgt60_ring_next_to_write] = ((uint32_t*)(radar.bgt60_buffer1))[x]; /* radar->full_buffer[x]; */
                bgt60_ring_level+=2;        /* Copying 2 samples at a time. */
                bgt60_ring_next_to_write++;
                bgt60_ring_next_to_write&=RING_BUFFER_MASK32;
            }

            int t=0;
            while ( bgt60_ring_level >= radar_configs.num_samples_per_frame )
            {
                for ( int i=0; i < radar_configs.num_samples_per_frame; i+=1 )
                {
                    (radar.bgt60_send_buffer)[t] = ((int16_t*)bgt60_tensor_ring)[bgt60_ring_next_to_read]*(1.0f);
                    t++;
                    bgt60_ring_level-=1;
                    bgt60_ring_next_to_read++;
                    bgt60_ring_next_to_read&=RING_BUFFER_MASK;
                }
                frames++;

                frames = 0;
                t = 0;

                /* Move cursor home */
                printf("\033[H");
                printf("DEEPCRAFT Radar Model Example\r\n\n");

                imai_result_enqueue = IMAI_enqueue(radar.bgt60_send_buffer);
                if (IMAI_RET_SUCCESS != imai_result_enqueue)
                {
                    CY_ASSERT(0);
                }
                if (xensiv_bgt60trxx_start_frame(&radar.bgt60_obj.dev, false) != XENSIV_BGT60TRXX_STATUS_OK)
                {

                }
                int imai_result = IMAI_dequeue(model_out);
                if (xensiv_bgt60trxx_start_frame(&radar.bgt60_obj.dev, true) != XENSIV_BGT60TRXX_STATUS_OK)
                {

                }
                int16_t best_label = 0;
                float max_score = -1000.0f;

                switch (imai_result)
                {
                    case IMAI_RET_SUCCESS:
                        for (uint8_t i = 0; i < IMAI_DATA_OUT_COUNT; i++)
                        {
                            printf("label: %-10s: score: %.2f\r\n", class_map[i], model_out[i]);
                            if (model_out[i] > max_score)
                            {
                                max_score = model_out[i];
                                best_label = i;
                            }
                        }
                        printf("\r\n");
                        printf("Output: %-30s\r\n", class_map[best_label]);
                        if ((best_label == PUSH_CLASS_INDEX) &&
                            (max_score >= PUSH_SCORE_THRESHOLD) &&
                            (led_state == LED_IDLE) &&
                            (led_cooldown_remaining_ms == 0))
                        {
                            cyhal_gpio_write(CYBSP_USER_LED, CYBSP_LED_STATE_ON);
                            led_pulse_remaining_ms = LED_PULSE_MS;
                            led_cooldown_remaining_ms = LED_COOLDOWN_MS;
                            led_state = LED_PULSE_ACTIVE;
                        }
                        break;
                    case IMAI_RET_NODATA:
                        break;
                    case IMAI_RET_ERROR:
                        /* Something went wrong, stop the program */
                        printf("Unable to perform inference. Unknown error occurred.\n");
                        break;
                    }

            }

    }
    }
}

/*******************************************************************************
* Function Name: radar_init
********************************************************************************
* Summary:
* This function configures the SPI interface, initializes radar and interrupt
* service routine to indicate the availability of radar data.
*
* Parameters:
*  void
*
* Return:
*  Success or error
*
*******************************************************************************/
static bool radar_init(dev_bgt60trxx_t *radar, cyhal_spi_t* spi)
{
    cy_rslt_t result;

    radar->have_data = false;
    radar->skipped_frames = 0;

    /* Reduce drive strength to improve EMI */
    Cy_GPIO_SetSlewRate(CYHAL_GET_PORTADDR(CYBSP_RSPI_MOSI), CYHAL_GET_PIN(CYBSP_RSPI_MOSI), CY_GPIO_SLEW_FAST);
    Cy_GPIO_SetDriveSel(CYHAL_GET_PORTADDR(CYBSP_RSPI_MOSI), CYHAL_GET_PIN(CYBSP_RSPI_MOSI), CY_GPIO_DRIVE_1_8);
    Cy_GPIO_SetSlewRate(CYHAL_GET_PORTADDR(CYBSP_RSPI_CLK), CYHAL_GET_PIN(CYBSP_RSPI_CLK), CY_GPIO_SLEW_FAST);
    Cy_GPIO_SetDriveSel(CYHAL_GET_PORTADDR(CYBSP_RSPI_CLK), CYHAL_GET_PIN(CYBSP_RSPI_CLK), CY_GPIO_DRIVE_1_8);

    /* Initialization uses preset 0 */
    result = xensiv_bgt60trxx_mtb_init(
            &radar->bgt60_obj,
            spi,
            CYBSP_RSPI_CS,
            CYBSP_RXRES_L,
            radar_configs.register_list,
            radar_configs.number_of_regs
            );

    if (result != CY_RSLT_SUCCESS)
    {
        printf("ERROR: xensiv_bgt60trxx_mtb_init failed\n");
        return false;
    }

    result = cyhal_gpio_init(CYBSP_RSPI_IRQ, CYHAL_GPIO_DIR_INPUT, CYHAL_GPIO_DRIVE_PULLDOWN, false);

    if (result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    xensiv_bgt60trxx_set_fifo_limit(&radar->bgt60_obj.dev, radar_configs.fifo_int_level);

    return true;

}


//led_timer_handler
//Timer ISR used to time LED pulse and cooldown without blocking inference.
static void led_timer_handler(void *callback_arg, cyhal_timer_event_t event)
{
    CY_UNUSED_PARAMETER(callback_arg);
    if (0U != (event & CYHAL_TIMER_IRQ_TERMINAL_COUNT))
    {
        if ((led_state == LED_PULSE_ACTIVE) && (led_pulse_remaining_ms > 0))
        {
            led_pulse_remaining_ms--;
            if (led_pulse_remaining_ms == 0)
            {
                cyhal_gpio_write(CYBSP_USER_LED, CYBSP_LED_STATE_OFF);
                led_state = LED_COOLDOWN;
            }
        }

        if (led_cooldown_remaining_ms > 0)
        {
            led_cooldown_remaining_ms--;
            if (led_cooldown_remaining_ms == 0)
            {
                led_state = LED_IDLE;
            }
        }
    }
    
}
/*******************************************************************************
 * Platform functions implementation
 ******************************************************************************/
static void spi_set_data_width(CySCB_Type* base, uint32_t data_width)
{
    CY_ASSERT(CY_SCB_SPI_IS_DATA_WIDTH_VALID(data_width));

    CY_REG32_CLR_SET(SCB_TX_CTRL(base),
                     SCB_TX_CTRL_DATA_WIDTH,
                     (uint32_t)data_width - 1U);
    CY_REG32_CLR_SET(SCB_RX_CTRL(base),
                     SCB_RX_CTRL_DATA_WIDTH,
                     (uint32_t)data_width - 1U);
}

/*******************************************************************************
* Summary:
*   This just loads preset from header file constants to enable selection of
*   various radar presets.
* See radar_settings.h for information of the sources of radar settings.
*
*******************************************************************************/
static void load_presets()
{
    radar_configs.start_freq =            P0_XENSIV_BGT60TRXX_CONF_START_FREQ_HZ;
    radar_configs.end_freq =              P0_XENSIV_BGT60TRXX_CONF_END_FREQ_HZ;
    radar_configs.samples_per_chirp =     P0_XENSIV_BGT60TRXX_CONF_NUM_SAMPLES_PER_CHIRP;
    radar_configs.chirps_per_frame =      P0_XENSIV_BGT60TRXX_CONF_NUM_CHIRPS_PER_FRAME;
    radar_configs.rx_antennas =           P0_XENSIV_BGT60TRXX_CONF_NUM_RX_ANTENNAS;
    radar_configs.tx_antennas =           P0_XENSIV_BGT60TRXX_CONF_NUM_TX_ANTENNAS;
    radar_configs.sample_rate =           P0_XENSIV_BGT60TRXX_CONF_SAMPLE_RATE;
    radar_configs.chirp_repetition_time = P0_XENSIV_BGT60TRXX_CONF_CHIRP_REPETITION_TIME_S;
    radar_configs.frame_repetition_time = P0_XENSIV_BGT60TRXX_CONF_FRAME_REPETITION_TIME_S;

    radar_configs.frame_rate = (int)(0.5 + 1.0/radar_configs.frame_repetition_time);
    radar_configs.num_samples_per_frame =
            radar_configs.samples_per_chirp *
            radar_configs.chirps_per_frame *
            radar_configs.rx_antennas;

    radar_configs.fifo_int_level = DEFAULT_FIFO_SETTING; /* This will equal 75% of the fifo. 12288 samples */

    radar_configs.number_of_regs = P0_XENSIV_BGT60TRXX_CONF_NUM_REGS;
    radar_configs.register_list = register_list_p0;

}
/*******************************************************************************
* Function Name: board_set_clocks
********************************************************************************
* Summary:
*   Reinitializes the clocks. FLL is dedicated for the audio done elseware.
*    PLL0 is not modified and it needs to be at 96Mhz for the usb clock.
*    PLL1 is set to 150 MHz and will drive the CPU Fast clock.
*    Peripheral speed will be half of the fast clock. I.e. 75 MHz
*    SPI clock can now be set to 75/4 = 18.75 MHz.
*
*
* Return:
*   True if initialization is successful, otherwise false.
*******************************************************************************/
bool board_set_clocks(void)
{
    cy_rslt_t result;
    cyhal_clock_t peri;
    cyhal_clock_t hf_0;
    cyhal_clock_t PLL_1;

    #define FAST_FREQ 150000000

    result = cyhal_clock_reserve(&peri, &CYHAL_CLOCK_PERI);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    result = cyhal_clock_reserve(&hf_0, &CYHAL_CLOCK_HF[0]);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    result = cyhal_clock_reserve(&PLL_1, &CYHAL_CLOCK_PLL[1]);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    /* Set the divider of peripheral clock first. */
    result = cyhal_clock_set_divider(&peri, 2);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    /* Set the frequency of PLL_1 and enable it. */
    result = cyhal_clock_set_frequency(&PLL_1, FAST_FREQ, NULL);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    result = cyhal_clock_set_enabled(&PLL_1, true, true);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    /* Set HF_0 clock to the source of PLL_1. */
    result = cyhal_clock_set_source(&hf_0, &CYHAL_CLOCK_PLL[1]);
    if(result != CY_RSLT_SUCCESS)
    {
        return false;
    }

    return true;
}
